import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';
import { ensureRoomTables } from '@/lib/rooms-db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    await ensureRoomTables(client);
    const { id } = await params;
    const roomId = Number(id);
    const body = await request.json();
    const sessionId = Number(body?.session_id);

    if (!Number.isFinite(roomId) || roomId <= 0) {
      return NextResponse.json({ success: false, error: '部屋IDが不正です' }, { status: 400 });
    }
    if (!Number.isFinite(sessionId) || sessionId <= 0) {
      return NextResponse.json({ success: false, error: 'セッションIDが不正です' }, { status: 400 });
    }

    const sess = await client.query(`SELECT id FROM sessions WHERE id = $1`, [sessionId]);
    if (sess.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'セッションが見つかりません' }, { status: 404 });
    }

    const upd = await client.query(
      `UPDATE song_room
          SET status = 1, session_id = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND status = 0
        RETURNING id, name, status, other, session_id, created_at, updated_at`,
      [roomId, sessionId]
    );

    if (upd.rows.length > 0) {
      return NextResponse.json({ success: true, room: upd.rows[0] });
    }

    const cur = await client.query(
      `SELECT id, name, status, session_id FROM song_room WHERE id = $1`,
      [roomId]
    );
    if (cur.rows.length === 0) {
      return NextResponse.json({ success: false, error: '部屋が見つかりません' }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'この部屋は現在利用中です',
        occupied: true,
        room: cur.rows[0],
      },
      { status: 409 }
    );
  } catch (e) {
    console.error('song_room PATCH:', e);
    return NextResponse.json({ success: false, error: 'カラオケルームの更新に失敗しました' }, { status: 500 });
  } finally {
    client.release();
  }
}
