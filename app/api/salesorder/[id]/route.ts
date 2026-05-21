import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';
import {
  applySalesOrderAcceptedAmountDelta,
  applySalesOrderAcceptedBizLogic,
} from '@/lib/salesorder-accepted-effects';
import { insertLogRecord, logBusinessDateNow } from '@/lib/log-record-db';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const client = await pool.connect();
  try {
    const { id } = await params;
    const { status, accepted_by, amount_delta } = await request.json();
    const amountDelta =
      amount_delta === undefined || amount_delta === null ? null : Number(amount_delta);
    
    console.log('売上注文更新リクエスト:', { id, status, accepted_by, amount_delta });
    
    if (!status && amountDelta === null) {
      return NextResponse.json(
        { success: false, error: 'ステータスまたは数量変更が必要です' },
        { status: 400 }
      );
    }

    if (amountDelta !== null && (!Number.isFinite(amountDelta) || amountDelta === 0 || !Number.isInteger(amountDelta))) {
      return NextResponse.json(
        { success: false, error: '数量変更は0以外の整数で指定してください' },
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

    // 既存注文の取得（在庫更新・ログ用にテーブル名・商品名・キャスト名を付与）
    const existingRes = await client.query(
      `SELECT
         so.id,
         so.product_id,
         so.amount,
         so.status,
         so.for_cast,
         so.cast_id,
         so.session_id,
         so.unit_price,
         so.total_price,
         so.accepted_at,
         so.created_at,
         p.name AS product_name,
         t.name AS table_label,
         u.name AS cast_name_for_order
       FROM salesorder so
       INNER JOIN sessions s ON s.id = so.session_id
       INNER JOIN "table" t ON t.id = s.table_id
       INNER JOIN product p ON p.id = so.product_id
       LEFT JOIN "user" u ON u.id = so.cast_id
       WHERE so.id = $1
       FOR UPDATE OF so`,
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

    if (amountDelta !== null) {
      if (existing.status === 'rejected') {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: '拒否済みの注文は数量変更できません' },
          { status: 400 }
        );
      }

      const oldAmount = Number(existing.amount) || 0;
      const newAmount = oldAmount + amountDelta;
      if (newAmount < 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: '数量は0未満にできません' },
          { status: 400 }
        );
      }

      if (amountDelta > 0) {
        const stockRes = await client.query(
          `SELECT amount FROM product WHERE id = $1 FOR UPDATE`,
          [Number(existing.product_id)]
        );
        const stock = Number(stockRes.rows[0]?.amount) || 0;
        if (stock < amountDelta) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { success: false, error: `在庫不足です。利用可能数量: ${stock}` },
            { status: 400 }
          );
        }
        await client.query(
          `UPDATE product SET amount = amount - $1 WHERE id = $2`,
          [amountDelta, Number(existing.product_id)]
        );
      } else {
        await client.query(
          `UPDATE product SET amount = amount + $1 WHERE id = $2`,
          [Math.abs(amountDelta), Number(existing.product_id)]
        );
      }

      const unitPrice = Number(existing.unit_price) || 0;
      const totalDelta = unitPrice * amountDelta;
      let updatedRow = null;

      if (newAmount === 0) {
        await client.query(`DELETE FROM salesorder WHERE id = $1`, [id]);
      } else {
        const quantityUpdateRes = await client.query(
          `
          UPDATE salesorder
             SET amount = $1,
                 total_price = $2
           WHERE id = $3
           RETURNING *
          `,
          [newAmount, unitPrice * newAmount, id]
        );
        updatedRow = quantityUpdateRes.rows[0];
      }

      if (existing.status === 'accepted') {
        await applySalesOrderAcceptedAmountDelta(
          client,
          existing,
          updatedRow || existing,
          totalDelta
        );
      }

      // 注文行が消えた場合のみシステムログ（明細削除）
      if (newAmount === 0 && existing.status !== 'rejected') {
        const removedQty = Math.abs(amountDelta);
        const unitPrice = Number(existing.unit_price) || 0;
        const originalAmount = unitPrice * removedQty;
        const castName = existing.cast_name_for_order ? String(existing.cast_name_for_order) : '';
        const targetStaff =
          existing.cast_id == null ? 'お客様' : castName || 'キャスト';
        const orderedAt = existing.accepted_at || existing.created_at || null;
        try {
          await insertLogRecord(client, {
            business_date: logBusinessDateNow(),
            table_label: String(existing.table_label || ''),
            action_type: '明細削除',
            original_amount: originalAmount,
            quantity: removedQty,
            target_staff_label: targetStaff,
            item_name: String(existing.product_name || ''),
            ordered_at: orderedAt,
            session_id: Number(existing.session_id) || null,
          });
        } catch (logErr) {
          console.error('log_record 明細削除ログエラー:', logErr);
        }
      }

      await client.query('COMMIT');
      return NextResponse.json({
        success: true,
        data: updatedRow,
        deleted: newAmount === 0,
      });
    }

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
      await applySalesOrderAcceptedBizLogic(client, existing, result.rows[0]);
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

    // 注文を取得し、pending以外は削除不可（ログ用に結合）
    const orderRes = await client.query(
      `SELECT
         so.id,
         so.product_id,
         so.amount,
         so.status,
         so.session_id,
         so.cast_id,
         so.for_cast,
         so.unit_price,
         so.created_at,
         so.accepted_at,
         p.name AS product_name,
         t.name AS table_label,
         u.name AS cast_name_for_order
       FROM salesorder so
       INNER JOIN sessions s ON s.id = so.session_id
       INNER JOIN "table" t ON t.id = s.table_id
       INNER JOIN product p ON p.id = so.product_id
       LEFT JOIN "user" u ON u.id = so.cast_id
       WHERE so.id = $1
       FOR UPDATE OF so`,
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

    const qty = Number(order.amount) || 0;
    const unitPrice = Number(order.unit_price) || 0;
    const castName = order.cast_name_for_order ? String(order.cast_name_for_order) : '';
    const targetStaff = order.cast_id == null ? 'お客様' : castName || 'キャスト';
    try {
      await insertLogRecord(client, {
        business_date: logBusinessDateNow(),
        table_label: String(order.table_label || ''),
        action_type: '明細削除',
        original_amount: unitPrice * qty,
        quantity: qty,
        target_staff_label: targetStaff,
        item_name: String(order.product_name || ''),
        ordered_at: order.accepted_at || order.created_at || null,
        session_id: Number(order.session_id) || null,
      });
    } catch (logErr) {
      console.error('log_record 明細削除ログエラー(pending DELETE):', logErr);
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
