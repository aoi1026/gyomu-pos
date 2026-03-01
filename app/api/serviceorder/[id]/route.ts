import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const client = await pool.connect();
  try {
    const { id } = await params;
    const { status, accepted_by } = await request.json();
    
    console.log('サービス注文更新リクエスト:', { id, status, accepted_by });
    
    if (!status) {
      return NextResponse.json(
        { success: false, error: 'ステータスが必要です' },
        { status: 400 }
      );
    }

    // ステータス制約を修正（必要に応じて）
    try {
      await client.query(`
        ALTER TABLE serviceorder DROP CONSTRAINT IF EXISTS serviceorder_status_check;
      `);
      await client.query(`
        ALTER TABLE serviceorder ADD CONSTRAINT serviceorder_status_check 
        CHECK (status IN ('pending', 'accepted', 'rejected', 'completed'));
      `);
      console.log('serviceorder status制約を修正しました');
    } catch (constraintError) {
      console.log('制約修正エラー（無視）:', constraintError);
    }

    const updateFields = ['status = $1'];
    const values = [status];
    let paramIndex = 2;

    // accepted_byカラムが存在するかチェックしてから追加
    try {
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'serviceorder' AND column_name = 'accepted_by'
      `);
      
      if (columnCheck.rows.length === 0) {
        // カラムが存在しない場合は追加
        await client.query(`
          ALTER TABLE serviceorder ADD COLUMN accepted_by INTEGER REFERENCES "user"(id)
        `);
        console.log('serviceorder accepted_byカラムを追加しました');
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
        WHERE table_name = 'serviceorder' AND column_name = 'accepted_at'
      `);
      
      if (columnCheck.rows.length === 0) {
        // カラムが存在しない場合は追加
        await client.query(`
          ALTER TABLE serviceorder ADD COLUMN accepted_at TIMESTAMP WITH TIME ZONE
        `);
        console.log('serviceorder accepted_atカラムを追加しました');
      }
      
      if (status === 'accepted') {
        updateFields.push(`accepted_at = CURRENT_TIMESTAMP`);
      }
    } catch (err) {
      console.log('accepted_atカラム処理エラー:', err);
    }

    values.push(id);

    const query = `UPDATE serviceorder SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    console.log('実行するクエリ:', query);
    console.log('パラメータ:', values);

    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      console.log('サービス注文が見つかりません:', id);
      return NextResponse.json(
        { success: false, error: 'サービス注文が見つかりません' },
        { status: 404 }
      );
    }

    console.log('更新成功:', result.rows[0]);
    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('サービス注文更新エラー:', error);
    
    // より詳細なエラー情報を提供
    let errorMessage = 'サービス注文の更新に失敗しました';
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
      } else if (error.message.includes('check constraint') && error.message.includes('serviceorder_status_check')) {
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

    // サービス注文を取得
    const orderRes = await client.query(
      `SELECT id, status FROM serviceorder WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ success: false, error: 'サービス注文が見つかりません' }, { status: 404 });
    }
    const order = orderRes.rows[0];
    
    // 承認済みの注文は削除不可
    if (order.status === 'accepted' || order.status === 'completed') {
      await client.query('ROLLBACK');
      return NextResponse.json({ success: false, error: '承認済みのサービス注文は削除できません' }, { status: 400 });
    }

    // サービス注文を削除
    await client.query(`DELETE FROM serviceorder WHERE id = $1`, [id]);

    await client.query('COMMIT');
    return NextResponse.json({ success: true });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('サービス注文削除エラー:', error);
    return NextResponse.json({ success: false, error: 'サービス注文の削除に失敗しました' }, { status: 500 });
  } finally {
    client.release();
  }
}