import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { cast_id, table_id, session_id, calltype } = await request.json();

    if (!cast_id || !table_id || !session_id) {
      return NextResponse.json(
        { success: false, error: '必要なパラメータが不足しています' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      // callmanagerテーブルにデータを挿入
      const result = await client.query(
        `INSERT INTO callmanager (cast_id, table_id, session_id, calltype, status) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, created_at`,
        [cast_id, table_id, session_id, calltype || 'manager', 'pending']
      );


      return NextResponse.json({
        success: true,
        data: result.rows[0]
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('スタッフ呼び出し保存エラー:', error);
    return NextResponse.json(
      { success: false, error: 'スタッフ呼び出しの保存に失敗しました' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const table_id = searchParams.get('table_id');
    const session_id = searchParams.get('session_id');

    const client = await pool.connect();
    
    try {
      let query = `
        SELECT 
          cm.id,
          cm.cast_id,
          cm.table_id,
          cm.session_id,
          cm.calltype,
          cm.status,
          cm.accepted_at,
          cm.accepted_by,
          cm.created_at,
          u.name as cast_name,
          t.name as table_name
        FROM callmanager cm
        JOIN "user" u ON cm.cast_id = u.id
        JOIN "table" t ON cm.table_id = t.id
      `;
      
      const params: any[] = [];
      const conditions: string[] = [];
      
      if (status) {
        conditions.push('cm.status = $' + (params.length + 1));
        params.push(status);
      }
      
      if (table_id) {
        conditions.push('cm.table_id = $' + (params.length + 1));
        params.push(table_id);
      }
      
      if (session_id) {
        conditions.push('cm.session_id = $' + (params.length + 1));
        params.push(session_id);
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += ' ORDER BY cm.created_at DESC';

      const result = await client.query(query, params);

      return NextResponse.json({
        success: true,
        data: result.rows
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('スタッフ呼び出し取得エラー:', error);
    return NextResponse.json(
      { success: false, error: 'スタッフ呼び出しの取得に失敗しました' },
      { status: 500 }
    );
  }
}
