import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';
import { releaseRoomsForSession } from '@/lib/rooms-db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const { id } = await params;
    const { cost, end_at, set_count, client: clientCount, status, set_extensions, is_paused, paused_at, paused_elapsed, created_at, pay_type } = await request.json();
    
    if (cost === undefined && !end_at && set_count === undefined && clientCount === undefined && status === undefined && set_extensions === undefined && is_paused === undefined && !paused_at && paused_elapsed === undefined && !created_at && pay_type === undefined) {
      return NextResponse.json(
        { success: false, error: '更新するデータが必要です' },
        { status: 400 }
      );
    }

    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (cost !== undefined) {
      updateFields.push(`cost = $${paramIndex}`);
      values.push(cost);
      paramIndex++;
    }

    if (end_at) {
      updateFields.push(`end_at = $${paramIndex}`);
      values.push(end_at);
      paramIndex++;
    }

    if (set_count !== undefined) {
      updateFields.push(`set_count = $${paramIndex}`);
      values.push(set_count);
      paramIndex++;
    }

    if (clientCount !== undefined) {
      updateFields.push(`client = $${paramIndex}`);
      values.push(clientCount);
      paramIndex++;
    }

    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    if (set_extensions !== undefined) {
      updateFields.push(`set_extensions = $${paramIndex}::jsonb`);
      values.push(JSON.stringify(set_extensions));
      paramIndex++;
    }

    if (is_paused !== undefined) {
      updateFields.push(`is_paused = $${paramIndex}`);
      values.push(is_paused);
      paramIndex++;
    }

    if (paused_at !== undefined) {
      updateFields.push(`paused_at = $${paramIndex}`);
      values.push(paused_at);
      paramIndex++;
    }

    if (paused_elapsed !== undefined) {
      updateFields.push(`paused_elapsed = $${paramIndex}`);
      values.push(paused_elapsed);
      paramIndex++;
    }

    if (created_at) {
      updateFields.push(`created_at = $${paramIndex}`);
      values.push(created_at);
      paramIndex++;
    }

    if (pay_type !== undefined) {
      updateFields.push(`pay_type = $${paramIndex}`);
      values.push(pay_type);
      paramIndex++;
    }

    values.push(id);

    const query = `UPDATE sessions SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    
    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'セッションが見つかりません' },
        { status: 404 }
      );
    }

    // set_extensionsをJSONからパース
    const row = result.rows[0];
    if (row.set_extensions) {
      try {
        row.set_extensions = typeof row.set_extensions === 'string' 
          ? JSON.parse(row.set_extensions) 
          : row.set_extensions;
      } catch (e) {
        row.set_extensions = [];
      }
    } else {
      row.set_extensions = [];
    }

    if (status === 0) {
      try {
        await releaseRoomsForSession(client, Number(id));
      } catch (releaseErr) {
        console.error('セッション終了時の部屋解放エラー:', releaseErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: row
    });
  } catch (error) {
    console.error('セッション更新エラー:', error);
    return NextResponse.json(
      { success: false, error: 'セッションの更新に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const { id } = await params;
    const sessionId = Number(id);

    if (!Number.isFinite(sessionId) || sessionId <= 0) {
      return NextResponse.json(
        { success: false, error: 'セッションIDが不正です' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    const sessionResult = await client.query(
      'SELECT id FROM sessions WHERE id = $1 FOR UPDATE',
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: 'セッションが見つかりません' },
        { status: 404 }
      );
    }

    // 旧DBでも安全に巻き戻せるよう、参照する集計カラムを用意する
    await client.query(`ALTER TABLE salesorder ADD COLUMN IF NOT EXISTS castsalary_price DECIMAL(12,2) DEFAULT 0.00`);
    await client.query(`ALTER TABLE salary ADD COLUMN IF NOT EXISTS sales_back_yen DECIMAL(12,2) DEFAULT 0.00`);
    await client.query(`ALTER TABLE salary ADD COLUMN IF NOT EXISTS main_nomination_count INTEGER DEFAULT 0`);
    await client.query(`ALTER TABLE salary ADD COLUMN IF NOT EXISTS inside_nomination_count INTEGER DEFAULT 0`);
    await client.query(`ALTER TABLE salary ADD COLUMN IF NOT EXISTS together_nomination_count INTEGER DEFAULT 0`);
    await client.query(`ALTER TABLE salary ADD COLUMN IF NOT EXISTS main_nomination_fee DECIMAL(12,2) DEFAULT 0.00`);
    await client.query(`ALTER TABLE salary ADD COLUMN IF NOT EXISTS inside_nomination_fee DECIMAL(12,2) DEFAULT 0.00`);
    await client.query(`ALTER TABLE salary ADD COLUMN IF NOT EXISTS together_nomination_fee DECIMAL(12,2) DEFAULT 0.00`);
    await client.query(`ALTER TABLE nomination ADD COLUMN IF NOT EXISTS cost_cast DECIMAL(10,2) DEFAULT 0.00`);

    // セッション内の注文で減った在庫を戻す（拒否済みは既に戻されているため除外）
    const restoredStock = await client.query(
      `
      WITH restored AS (
        SELECT product_id, COALESCE(SUM(amount), 0) AS amount
        FROM salesorder
        WHERE session_id = $1
          AND COALESCE(status, 'pending') <> 'rejected'
        GROUP BY product_id
      )
      UPDATE product p
         SET amount = p.amount + restored.amount
      FROM restored
      WHERE p.id = restored.product_id
      RETURNING p.id
      `,
      [sessionId]
    );

    // 承認済みキャスト注文で加算済みの売上バックを戻す
    await client.query(
      `
      WITH cast_sales AS (
        SELECT
          cast_id,
          EXTRACT(YEAR FROM COALESCE(accepted_at, created_at))::int AS year,
          EXTRACT(MONTH FROM COALESCE(accepted_at, created_at))::int AS month,
          COALESCE(SUM(castsalary_price), 0) AS amount
        FROM salesorder
        WHERE session_id = $1
          AND status = 'accepted'
          AND COALESCE(for_cast, 0) = 1
          AND cast_id IS NOT NULL
        GROUP BY cast_id, year, month
      )
      UPDATE salary s
         SET sales_back_yen = GREATEST(0, COALESCE(s.sales_back_yen, 0) - cast_sales.amount)
      FROM cast_sales
      WHERE s.user_id = cast_sales.cast_id
        AND s.year = cast_sales.year
        AND s.month = cast_sales.month
      `,
      [sessionId]
    );

    // 指名登録時に加算済みの指名回数・指名料取り分を戻す
    await client.query(
      `
      WITH nomination_summary AS (
        SELECT
          cast_id,
          EXTRACT(YEAR FROM created_at)::int AS year,
          EXTRACT(MONTH FROM created_at)::int AS month,
          SUM(CASE WHEN type_id = 'main' THEN 1 ELSE 0 END)::int AS main_count,
          SUM(CASE WHEN type_id = 'inside' THEN 1 ELSE 0 END)::int AS inside_count,
          SUM(CASE WHEN type_id = 'together' THEN 1 ELSE 0 END)::int AS together_count,
          COALESCE(SUM(CASE WHEN type_id = 'main' THEN cost_cast ELSE 0 END), 0) AS main_fee,
          COALESCE(SUM(CASE WHEN type_id = 'inside' THEN cost_cast ELSE 0 END), 0) AS inside_fee,
          COALESCE(SUM(CASE WHEN type_id = 'together' THEN cost_cast ELSE 0 END), 0) AS together_fee
        FROM nomination
        WHERE session_id = $1
          AND cast_id IS NOT NULL
        GROUP BY cast_id, year, month
      )
      UPDATE salary s
         SET main_nomination_count = GREATEST(0, COALESCE(s.main_nomination_count, 0) - nomination_summary.main_count),
             inside_nomination_count = GREATEST(0, COALESCE(s.inside_nomination_count, 0) - nomination_summary.inside_count),
             together_nomination_count = GREATEST(0, COALESCE(s.together_nomination_count, 0) - nomination_summary.together_count),
             main_nomination_fee = GREATEST(0, COALESCE(s.main_nomination_fee, 0) - nomination_summary.main_fee),
             inside_nomination_fee = GREATEST(0, COALESCE(s.inside_nomination_fee, 0) - nomination_summary.inside_fee),
             together_nomination_fee = GREATEST(0, COALESCE(s.together_nomination_fee, 0) - nomination_summary.together_fee)
      FROM nomination_summary
      WHERE s.user_id = nomination_summary.cast_id
        AND s.year = nomination_summary.year
        AND s.month = nomination_summary.month
      `,
      [sessionId]
    );

    await releaseRoomsForSession(client, sessionId);

    // 関連テーブルは sessions(id) の ON DELETE CASCADE で削除される
    await client.query('DELETE FROM sessions WHERE id = $1', [sessionId]);

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      data: {
        session_id: sessionId,
        restored_products: restoredStock.rowCount || 0
      }
    });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('セッション取消エラー:', error);
    return NextResponse.json(
      { success: false, error: 'セッションの取消に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
