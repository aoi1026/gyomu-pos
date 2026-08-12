import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';
import { ensureRoomTables } from '@/lib/rooms-db';

export async function GET() {
  const client = await pool.connect();
  try {
    await ensureRoomTables(client);
    const result = await client.query(
      `SELECT id, name, status, other, session_id, created_at, updated_at
       FROM song_room
       ORDER BY id ASC`
    );
    return NextResponse.json({ success: true, rooms: result.rows });
  } catch (e) {
    console.error('song_room GET:', e);
    return NextResponse.json({ success: false, error: 'カラオケルーム一覧の取得に失敗しました' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    await ensureRoomTables(client);
    const body = await request.json();
    const name = String(body?.name ?? '').trim();
    const other = body?.other != null ? String(body.other) : null;
    if (!name) {
      return NextResponse.json({ success: false, error: '部屋名を入力してください' }, { status: 400 });
    }
    const result = await client.query(
      `INSERT INTO song_room (name, status, other) VALUES ($1, 0, $2)
       RETURNING id, name, status, other, session_id, created_at, updated_at`,
      [name, other]
    );
    return NextResponse.json({ success: true, room: result.rows[0] });
  } catch (e) {
    console.error('song_room POST:', e);
    return NextResponse.json({ success: false, error: 'カラオケルームの追加に失敗しました' }, { status: 500 });
  } finally {
    client.release();
  }
}
