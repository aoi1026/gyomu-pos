import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function GET() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        s.*,
        t.name as table_name,
        t.capacity
      FROM sessions s
      LEFT JOIN "table" t ON s.table_id = t.id
      ORDER BY s.created_at DESC
    `);
    
    // set_extensionsをJSONからパース
    const parsedRows = result.rows.map((row: any) => {
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
      return row;
    });
    
    return NextResponse.json({
      success: true,
      data: parsedRows
    });
  } catch (error) {
    console.error('セッションデータ取得エラー:', error);
    return NextResponse.json(
      { success: false, error: 'セッションデータの取得に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { table_id, cost, client: clientCount, status, pay_type } = await request.json();
    
    if (!table_id) {
      return NextResponse.json(
        { success: false, error: 'テーブルIDが必要です' },
        { status: 400 }
      );
    }

    // セッション開始時は初期状態で停止状態にする（is_paused: true, paused_at: 現在時刻）
    const now = new Date().toISOString();
    const result = await client.query(
      'INSERT INTO sessions (table_id, cost, set_count, client, status, is_paused, paused_at, paused_elapsed, set_extensions, pay_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10) RETURNING *',
      [table_id, cost || 0, 1, clientCount || 0, status !== undefined ? status : 1, true, now, 0, JSON.stringify([]), pay_type ?? null]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('セッション作成エラー:', error);
    return NextResponse.json(
      { success: false, error: 'セッションの作成に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
