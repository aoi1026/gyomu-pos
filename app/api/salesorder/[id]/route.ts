import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const client = await pool.connect();
  try {
    const { status, accepted_by } = await request.json();
    
    console.log('売上注文更新リクエスト:', { id: params.id, status, accepted_by });
    
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
      `SELECT product_id, amount, status FROM salesorder WHERE id = $1 FOR UPDATE`,
      [params.id]
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

    const updateFields = ['status = $1'];
    const values = [status];
    let paramIndex = 2;

    // accepted_byカラムが存在するかチェックしてから追加
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
      
      if (accepted_by) {
        updateFields.push(`accepted_by = $${paramIndex}`);
        values.push(accepted_by);
        paramIndex++;
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

    values.push(params.id);

    const query = `UPDATE salesorder SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    console.log('実行するクエリ:', query);
    console.log('パラメータ:', values);

    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      console.log('売上注文が見つかりません:', params.id);
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
