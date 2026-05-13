import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';
import { getOrderApprovalRequired } from '@/lib/order-approval-required';

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    // 外部キー制約を修正（必要に応じて）
    try {
      await client.query(`
        ALTER TABLE serviceorder DROP CONSTRAINT IF EXISTS serviceorder_service_id_fkey;
      `);
      await client.query(`
        ALTER TABLE serviceorder ADD CONSTRAINT serviceorder_service_id_fkey 
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE;
      `);
      console.log('serviceorder外部キー制約を修正しました');
    } catch (constraintError) {
      console.log('制約修正エラー（無視）:', constraintError);
    }
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const sessionId = searchParams.get('session_id');
    
    let query = `
      SELECT 
        so.*,
        u.name as cast_name,
        u.mail as cast_email,
        s.name as service_name,
        t.name as table_name,
        sess.id as session_id
      FROM serviceorder so
      LEFT JOIN "user" u ON so.cast_id = u.id
      LEFT JOIN services s ON so.service_id = s.id
      LEFT JOIN "table" t ON so.table_id = t.id
      LEFT JOIN sessions sess ON so.session_id = sess.id
    `;
    
    const params = [];
    const conditions = [];
    
    if (status) {
      conditions.push('so.status = $' + (params.length + 1));
      params.push(status);
    }
    
    if (sessionId) {
      conditions.push('so.session_id = $' + (params.length + 1));
      params.push(sessionId);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY so.created_at DESC';
    
    const result = await client.query(query, params);
    
    return NextResponse.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('サービス注文データ取得エラー:', error);
    return NextResponse.json(
      { success: false, error: 'サービス注文データの取得に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    // 外部キー制約を修正（必要に応じて）
    try {
      await client.query(`
        ALTER TABLE serviceorder DROP CONSTRAINT IF EXISTS serviceorder_service_id_fkey;
      `);
      await client.query(`
        ALTER TABLE serviceorder ADD CONSTRAINT serviceorder_service_id_fkey 
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE;
      `);
      console.log('serviceorder外部キー制約を修正しました');
    } catch (constraintError) {
      console.log('制約修正エラー（無視）:', constraintError);
    }
    const { cast_id, service_id, amount, table_id, session_id } = await request.json();
    
    if (!service_id || !amount || !table_id || !session_id) {
      return NextResponse.json(
        { success: false, error: '必須項目が不足しています' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: '注文数量は1以上である必要があります' },
        { status: 400 }
      );
    }

    // サービス情報を取得
    const serviceResult = await client.query(
      'SELECT id, name FROM services WHERE id = $1',
      [service_id]
    );

    if (serviceResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'サービスが見つかりません' },
        { status: 404 }
      );
    }

    const approvalRequired = await getOrderApprovalRequired(client);

    if (!approvalRequired) {
      try {
        const columnCheck = await client.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'serviceorder' AND column_name = 'accepted_at'
        `);
        if (columnCheck.rows.length === 0) {
          await client.query(`ALTER TABLE serviceorder ADD COLUMN accepted_at TIMESTAMP WITH TIME ZONE`);
        }
      } catch {
        // ignore
      }
      const serviceOrderResult = await client.query(
        `INSERT INTO serviceorder (cast_id, service_id, amount, table_id, session_id, status, accepted_at)
         VALUES ($1, $2, $3, $4, $5, 'accepted', CURRENT_TIMESTAMP) RETURNING *`,
        [cast_id || null, service_id, amount, table_id, session_id]
      );
      return NextResponse.json({
        success: true,
        data: serviceOrderResult.rows[0],
      });
    }

    // サービス注文を作成（statusはpendingで開始）
    const serviceOrderResult = await client.query(
      'INSERT INTO serviceorder (cast_id, service_id, amount, table_id, session_id, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [cast_id || null, service_id, amount, table_id, session_id, 'pending']
    );

    return NextResponse.json({
      success: true,
      data: serviceOrderResult.rows[0]
    });
  } catch (error) {
    console.error('サービス注文作成エラー:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'サービス注文の作成に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}