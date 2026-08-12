import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

/**
 * アクティブセッションを別テーブルへ移動する。
 * sessions と table_id を持つ子レコードを同一トランザクションで更新する。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idParam } = await params;
  const sessionId = Number.parseInt(idParam, 10);
  if (!Number.isFinite(sessionId) || sessionId <= 0) {
    return NextResponse.json(
      { success: false, error: 'セッションIDが不正です' },
      { status: 400 }
    );
  }

  let newTableId: number;
  try {
    const body = await request.json();
    newTableId = Number(body?.table_id);
  } catch {
    return NextResponse.json(
      { success: false, error: 'リクエスト本文が不正です' },
      { status: 400 }
    );
  }

  if (!Number.isFinite(newTableId) || newTableId <= 0) {
    return NextResponse.json(
      { success: false, error: '移動先のテーブルIDが必要です' },
      { status: 400 }
    );
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const sessionRow = await client.query(
      `SELECT id, table_id, status FROM sessions WHERE id = $1 FOR UPDATE`,
      [sessionId]
    );

    if (sessionRow.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: 'セッションが見つかりません' },
        { status: 404 }
      );
    }

    const row = sessionRow.rows[0];
    if (Number(row.status) !== 1) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: 'アクティブなセッションのみ移動できます' },
        { status: 400 }
      );
    }

    const oldTableId = Number(row.table_id);

    const tableOk = await client.query(`SELECT 1 FROM "table" WHERE id = $1`, [newTableId]);
    if (tableOk.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: '移動先テーブルが存在しません' },
        { status: 400 }
      );
    }

    if (oldTableId === newTableId) {
      await client.query('COMMIT');
      const refreshed = await pool.query(
        `SELECT s.*, t.name AS table_name FROM sessions s
         LEFT JOIN "table" t ON s.table_id = t.id WHERE s.id = $1`,
        [sessionId]
      );
      return NextResponse.json({ success: true, data: refreshed.rows[0], moved: false });
    }

    const conflict = await client.query(
      `SELECT id FROM sessions WHERE table_id = $1 AND status = 1 AND id <> $2 LIMIT 1`,
      [newTableId, sessionId]
    );

    if (conflict.rows.length > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: '移動先のテーブルには既にアクティブなセッションがあります' },
        { status: 409 }
      );
    }

    await client.query(`UPDATE sessions SET table_id = $1 WHERE id = $2`, [newTableId, sessionId]);

    const childUpdates = [
      `UPDATE salesorder SET table_id = $1 WHERE session_id = $2`,
      `UPDATE nomination SET table_id = $1 WHERE session_id = $2`,
      `UPDATE serviceorder SET table_id = $1 WHERE session_id = $2`,
      `UPDATE callmanager SET table_id = $1 WHERE session_id = $2`,
      `UPDATE bottle_keep SET table_id = $1 WHERE session_id = $2`,
    ];

    for (const sql of childUpdates) {
      try {
        await client.query(sql, [newTableId, sessionId]);
      } catch (e: unknown) {
        const err = e as { code?: string };
        if (err?.code === '42P01') {
          continue;
        }
        throw e;
      }
    }

    await client.query('COMMIT');

    const result = await pool.query(
      `SELECT s.*, t.name AS table_name FROM sessions s
       LEFT JOIN "table" t ON s.table_id = t.id WHERE s.id = $1`,
      [sessionId]
    );
    const data = result.rows[0];
    if (data?.set_extensions) {
      try {
        data.set_extensions =
          typeof data.set_extensions === 'string'
            ? JSON.parse(data.set_extensions)
            : data.set_extensions;
      } catch {
        data.set_extensions = [];
      }
    } else {
      data.set_extensions = [];
    }

    return NextResponse.json({
      success: true,
      data,
      moved: true,
      previous_table_id: oldTableId,
      table_id: newTableId,
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore */
    }
    console.error('セッションテーブル移動エラー:', error);
    return NextResponse.json(
      { success: false, error: 'テーブル移動に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
