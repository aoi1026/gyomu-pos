import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { type, table_id, table_label, cast_name, message, priority } = await request.json();

    if (!type || !table_id || !message) {
      return NextResponse.json(
        { success: false, error: '必要なパラメータが不足しています' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      // 通知テーブルにデータを挿入
      const result = await client.query(
        `INSERT INTO notifications (type, table_id, table_label, cast_name, message, priority, status, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP) 
         RETURNING id, created_at`,
        [type, table_id, table_label, cast_name, message, priority || 'medium', 'unread']
      );

      return NextResponse.json({
        success: true,
        data: result.rows[0]
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('通知保存エラー:', error);
    return NextResponse.json(
      { success: false, error: '通知の保存に失敗しました' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    const client = await pool.connect();
    
    try {
      let query = `
        SELECT 
          id,
          type,
          table_id,
          table_label,
          cast_name,
          message,
          priority,
          status,
          created_at
        FROM notifications
      `;
      
      const params: any[] = [];
      const conditions: string[] = [];
      
      if (type) {
        conditions.push('type = $' + (params.length + 1));
        params.push(type);
      }
      
      if (status) {
        conditions.push('status = $' + (params.length + 1));
        params.push(status);
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += ' ORDER BY created_at DESC';

      const result = await client.query(query, params);

      return NextResponse.json({
        success: true,
        data: result.rows
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('通知取得エラー:', error);
    return NextResponse.json(
      { success: false, error: '通知の取得に失敗しました' },
      { status: 500 }
    );
  }
}