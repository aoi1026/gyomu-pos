import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function GET() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        s.*,
        t.name as table_name,
        t.capacity,
        u.name as cast_name
      FROM sessions s
      LEFT JOIN "table" t ON s.table_id = t.id
      LEFT JOIN "user" u ON s.cast_id = u.id
      ORDER BY s.created_at DESC
    `);
    
    return NextResponse.json({
      success: true,
      data: result.rows
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
    const { table_id, cost, cast_id, nomination_type } = await request.json();
    
    if (!table_id) {
      return NextResponse.json(
        { success: false, error: 'テーブルIDが必要です' },
        { status: 400 }
      );
    }

    const result = await client.query(
      'INSERT INTO sessions (table_id, cost, cast_id, nomination_type) VALUES ($1, $2, $3, $4) RETURNING *',
      [table_id, cost || 0, cast_id || null, nomination_type || 'main']
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
