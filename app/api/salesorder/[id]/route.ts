import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const client = await pool.connect();
  try {
    const { id } = await params;
    const { status, accepted_by } = await request.json();
    
    console.log('売上注文更新リクエスト:', { id, status, accepted_by });
    
    if (!status) {
      return NextResponse.json(
        { success: false, error: 'ステータスが必要です' },
        { status: 400 }
      );
    }

    // ステータス制約を修正（必要に応じて）
    try {
      await client.query(`
        ALTER TABLE salesorder DROP CONSTRAINT IF EXISTS salesorder_status_check;
      `);
      await client.query(`
        ALTER TABLE salesorder ADD CONSTRAINT salesorder_status_check 
        CHECK (status IN ('pending', 'accepted', 'rejected', 'completed'));
      `);
      console.log('status制約を修正しました');
    } catch (constraintError) {
      console.log('制約修正エラー（無視）:', constraintError);
    }

    // トランザクション開始
    await client.query('BEGIN');

    // 既存注文の取得（在庫更新のため）
    const existingRes = await client.query(
      `SELECT id, product_id, amount, status, for_cast, cast_id, session_id, total_price
         FROM salesorder
        WHERE id = $1
        FOR UPDATE`,
      [id]
    );
    if (existingRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: '売上注文が見つかりません' },
        { status: 404 }
      );
    }
    const existing = existingRes.rows[0];
    const wasRejected = existing.status === 'rejected';
    const wasAccepted = existing.status === 'accepted';

    const updateFields = ['status = $1'];
    const values = [status];
    let paramIndex = 2;

    // accepted_byカラムが存在するかチェックしてから追加（参照先 user が存在する場合のみ設定）
    try {
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'salesorder' AND column_name = 'accepted_by'
      `);
      
      if (columnCheck.rows.length === 0) {
        // カラムが存在しない場合は追加
        await client.query(`
          ALTER TABLE salesorder ADD COLUMN accepted_by INTEGER REFERENCES "user"(id)
        `);
        console.log('accepted_byカラムを追加しました');
      }
      
      if (accepted_by != null) {
        const userCheck = await client.query(
          `SELECT id FROM "user" WHERE id = $1`,
          [accepted_by]
        );
        if (userCheck.rows.length > 0) {
          updateFields.push(`accepted_by = $${paramIndex}`);
          values.push(accepted_by);
          paramIndex++;
        }
      }
    } catch (err) {
      console.log('accepted_byカラム処理エラー:', err);
    }

    // accepted_atカラムが存在するかチェックしてから追加
    try {
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'salesorder' AND column_name = 'accepted_at'
      `);
      
      if (columnCheck.rows.length === 0) {
        // カラムが存在しない場合は追加
        await client.query(`
          ALTER TABLE salesorder ADD COLUMN accepted_at TIMESTAMP WITH TIME ZONE
        `);
        console.log('accepted_atカラムを追加しました');
      }
      
      if (status === 'accepted') {
        updateFields.push(`accepted_at = CURRENT_TIMESTAMP`);
      }
    } catch (err) {
      console.log('accepted_atカラム処理エラー:', err);
    }

    values.push(id);

    const query = `UPDATE salesorder SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    console.log('実行するクエリ:', query);
    console.log('パラメータ:', values);

    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      console.log('売上注文が見つかりません:', id);
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: '売上注文が見つかりません' },
        { status: 404 }
      );
    }

    // 拒否時の在庫戻し（以前が未拒否で今回拒否へ変更された場合のみ）
    if (status === 'rejected' && !wasRejected) {
      try {
        await client.query(
          `UPDATE product SET amount = amount + $1 WHERE id = $2`,
          [Number(existing.amount) || 0, Number(existing.product_id)]
        );
        console.log('在庫を戻しました: product_id=', existing.product_id, ' amount+=', existing.amount);
      } catch (stockErr) {
        console.error('在庫戻しエラー:', stockErr);
        // ここでロールバックし、詳細を返す
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: '在庫の更新に失敗しました', details: stockErr instanceof Error ? stockErr.message : String(stockErr) },
          { status: 500 }
        );
      }
    }

    // 承認時：キャスト用注文(for_cast=1)は、承認された瞬間に rank_cost へ加算（未accepted→accepted のときのみ）
    if (status === 'accepted' && !wasAccepted) {
      const forCast = Number(existing.for_cast) === 1;
      const castId = existing.cast_id ? Number(existing.cast_id) : null;
      const sessId = existing.session_id ? Number(existing.session_id) : null;
      const price = Number(existing.total_price) || 0;

      if (forCast && castId && sessId && price > 0) {
        try {
          // 旧環境でも落ちないように最低限の保険
          await client.query(`ALTER TABLE nomination ADD COLUMN IF NOT EXISTS rank_cost DECIMAL(12,2) DEFAULT 0.00`);
          await client.query(`ALTER TABLE nomination ADD COLUMN IF NOT EXISTS tomain_nomination INTEGER DEFAULT 0`);
          await client.query(`ALTER TABLE salesorder ADD COLUMN IF NOT EXISTS castsalary_price DECIMAL(12,2) DEFAULT 0.00`);
          await client.query(`ALTER TABLE salary ADD COLUMN IF NOT EXISTS sales_back_yen DECIMAL(12,2) DEFAULT 0.00`);

          await client.query(
            `
            UPDATE nomination
               SET rank_cost = COALESCE(rank_cost, 0) + $1
             WHERE session_id = $2
               AND cast_id = $3
               AND (
                 type_id IN ('main','together')
                 OR (type_id = 'inside' AND COALESCE(tomain_nomination,0) = 1)
               )
            `,
            [price, sessId, castId]
          );

          // castsalary_price を計算して salesorder に保存
          // salary_category.value の規則:
          // -1 => total_price
          // 0..1 => total_price * value
          // >1 => value
          // (未設定の場合は total_price をそのまま扱う)
          const categoryRes = await client.query(
            `SELECT category_id FROM product WHERE id = $1`,
            [Number(existing.product_id)]
          );
          const categoryId = categoryRes.rows[0]?.category_id ? Number(categoryRes.rows[0].category_id) : null;

          let computed = price;
          if (categoryId) {
            const scRes = await client.query(
              `SELECT value FROM salary_category WHERE cast_id = $1 AND category_id = $2 ORDER BY id DESC LIMIT 1`,
              [castId, categoryId]
            );
            const vRaw = scRes.rows[0]?.value;
            const v = vRaw === null || vRaw === undefined ? null : Number(vRaw);
            if (v === null || !Number.isFinite(v)) {
              computed = price;
            } else if (v === -1) {
              computed = price;
            } else if (v >= 0 && v <= 1) {
              computed = price * v;
            } else if (v > 1) {
              computed = v;
            } else {
              computed = 0;
            }
          }

          await client.query(
            `UPDATE salesorder SET castsalary_price = $1 WHERE id = $2`,
            [computed, id]
          );

          // salary.sales_back_yen へ castsalary_price を accepted_at の年月で加算
          // accepted_at はこのPATCHで accepted にした瞬間にセットされる想定
          const acceptedAt = result.rows[0]?.accepted_at ?? null;
          const ymRes = await client.query(
            `SELECT EXTRACT(YEAR FROM $1::timestamptz)::int AS year, EXTRACT(MONTH FROM $1::timestamptz)::int AS month`,
            [acceptedAt]
          );
          const year = Number(ymRes.rows[0]?.year);
          const month = Number(ymRes.rows[0]?.month);
          const add = Number(computed) || 0;
          if (Number.isFinite(year) && Number.isFinite(month) && add > 0) {
            await client.query(
              `
              INSERT INTO salary (user_id, year, month, sales_back_yen)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT (user_id, year, month)
              DO UPDATE SET sales_back_yen = COALESCE(salary.sales_back_yen, 0) + EXCLUDED.sales_back_yen
              `,
              [castId, year, month, add]
            );
          }
        } catch (e) {
          console.error('rank_cost加算エラー（承認時）:', e);
        }
      }
    }

    await client.query('COMMIT');
    console.log('更新成功:', result.rows[0]);
    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('売上注文更新エラー:', error);
    try { await client.query('ROLLBACK'); } catch {}
    
    // より詳細なエラー情報を提供
    let errorMessage = '売上注文の更新に失敗しました';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        errorMessage = 'データベースのカラムが存在しません。管理者にお問い合わせください。';
        statusCode = 500;
      } else if (error.message.includes('foreign key')) {
        errorMessage = '参照先のデータが存在しません。';
        statusCode = 400;
      } else if (error.message.includes('permission denied')) {
        errorMessage = 'データベースへの書き込み権限がありません。';
        statusCode = 403;
      } else if (error.message.includes('check constraint') && error.message.includes('salesorder_status_check')) {
        errorMessage = 'ステータスの値が無効です。有効な値: pending, accepted, rejected, completed';
        statusCode = 400;
      } else {
        errorMessage = `データベースエラー: ${error.message}`;
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: error instanceof Error ? error.message : '不明なエラー',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: statusCode }
    );
  } finally {
    client.release();
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const client = await pool.connect();
  try {
    const { id } = await params;
    await client.query('BEGIN');

    // 注文を取得し、pending以外は削除不可
    const orderRes = await client.query(
      `SELECT id, product_id, amount, status FROM salesorder WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ success: false, error: '注文が見つかりません' }, { status: 404 });
    }
    const order = orderRes.rows[0];
    if (order.status !== 'pending') {
      await client.query('ROLLBACK');
      return NextResponse.json({ success: false, error: '承認待ち以外は削除できません' }, { status: 400 });
    }

    // 在庫を戻す
    await client.query(
      `UPDATE product SET amount = amount + $1 WHERE id = $2`,
      [Number(order.amount) || 0, Number(order.product_id)]
    );

    // 注文を削除
    await client.query(`DELETE FROM salesorder WHERE id = $1`, [id]);

    await client.query('COMMIT');
    return NextResponse.json({ success: true });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('売上注文削除エラー:', error);
    return NextResponse.json({ success: false, error: '注文の削除に失敗しました' }, { status: 500 });
  } finally {
    client.release();
  }
}
