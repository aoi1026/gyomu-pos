import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

// ボトルキープ情報の取得
export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');
    const tableId = searchParams.get('table_id');

    let result;
    
    // If both session_id and table_id are provided, filter by them
    if (sessionId && tableId) {
      result = await client.query(
        `SELECT * FROM bottle_keep WHERE session_id = $1 AND table_id = $2 ORDER BY created_at DESC`,
        [parseInt(sessionId), parseInt(tableId)]
      );
    } else {
      // Otherwise, return all bottles (for admin management page)
      result = await client.query(
        `SELECT * FROM bottle_keep ORDER BY created_at DESC`
      );
    }

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('ボトルキープ取得エラー:', error);
    return NextResponse.json(
      { success: false, error: 'ボトルキープ情報の取得に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// ボトルキープ情報の作成
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { clientName, clientEmail, bottleName, amount, sessionId, tableId, other } = await request.json();

    if (!clientName || !bottleName || amount === undefined || !sessionId || !tableId) {
      return NextResponse.json(
        { success: false, error: '必要な情報が不足しています' },
        { status: 400 }
      );
    }

    const result = await client.query(
      `INSERT INTO bottle_keep (client_name, client_email, bottle_name, amount, session_id, table_id, other)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [clientName, clientEmail || null, bottleName, amount, sessionId, tableId, other || null]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('ボトルキープ作成エラー:', error);
    return NextResponse.json(
      { success: false, error: 'ボトルキープ情報の作成に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

