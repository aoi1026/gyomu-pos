import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';
import { ensureRoomTables } from '@/lib/rooms-db';

export async function GET() {
  const client = await pool.connect();
  try {
    await ensureRoomTables(client);
    const result = await client.query(
      `SELECT id, name, price, status, other, session_id, created_at, updated_at
       FROM vip_room
       ORDER BY id ASC`
    );
    return NextResponse.json({ success: true, rooms: result.rows });
  } catch (e) {
    console.error('vip_room GET:', e);
    return NextResponse.json({ success: false, error: 'VIPルーム一覧の取得に失敗しました' }, { status: 500 });
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
    const price = Number(body?.price ?? 0);
    const other = body?.other != null ? String(body.other) : null;
    if (!name) {
      return NextResponse.json({ success: false, error: '部屋名を入力してください' }, { status: 400 });
    }
    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ success: false, error: '料金は0以上で入力してください' }, { status: 400 });
    }
    const result = await client.query(
      `INSERT INTO vip_room (name, price, status, other) VALUES ($1, $2, 0, $3)
       RETURNING id, name, price, status, other, session_id, created_at, updated_at`,
      [name, price, other]
    );
    return NextResponse.json({ success: true, room: result.rows[0] });
  } catch (e) {
    console.error('vip_room POST:', e);
    return NextResponse.json({ success: false, error: 'VIPルームの追加に失敗しました' }, { status: 500 });
  } finally {
    client.release();
  }
}
