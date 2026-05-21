import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';
import { getBusinessDayYmd } from '@/lib/business-day';
import { ensureLogRecordTable, insertLogRecord, logBusinessDateNow } from '@/lib/log-record-db';

export const dynamic = 'force-dynamic';

/**
 * 領収書印刷のログ（クライアントから送信）。明細削除は salesorder API 側で記録。
 */
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json().catch(() => ({}));
    const actionType = String(body?.action_type || '');
    if (actionType !== 'レシート印刷') {
      return NextResponse.json({ success: false, error: 'action_type が不正です' }, { status: 400 });
    }
    const sessionId = Number(body?.session_id);
    if (!Number.isFinite(sessionId) || sessionId <= 0) {
      return NextResponse.json({ success: false, error: 'session_id が不正です' }, { status: 400 });
    }
    const rawPay = String(body?.payment_method || '');
    const payment_method = rawPay === '現金' ? '現金' : 'カード';
    const original_amount =
      body?.original_amount === null || body?.original_amount === undefined || body?.original_amount === ''
        ? null
        : Number(body.original_amount);
    const memo = body?.memo != null ? String(body.memo) : null;

    await ensureLogRecordTable(client);
    const sess = await client.query(
      `SELECT s.id, t.name AS table_label
         FROM sessions s
         INNER JOIN "table" t ON t.id = s.table_id
        WHERE s.id = $1
        LIMIT 1`,
      [sessionId]
    );
    if (sess.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'セッションが見つかりません' }, { status: 404 });
    }

    await insertLogRecord(client, {
      business_date: logBusinessDateNow(),
      table_label: String(sess.rows[0].table_label || ''),
      action_type: 'レシート印刷',
      original_amount: Number.isFinite(original_amount as number) ? (original_amount as number) : null,
      payment_method,
      memo,
      session_id: sessionId,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('log-records POST エラー:', e);
    return NextResponse.json({ success: false, error: 'ログの保存に失敗しました' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === '1';
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 2000, 1), 20000);

    await ensureLogRecordTable(client);

    if (all) {
      const result = await client.query(
        `SELECT
           id,
           created_at,
           business_date,
           table_label,
           action_type,
           original_amount,
           quantity,
           target_staff_label,
           item_name,
           ordered_at,
           payment_method,
           memo,
           session_id
         FROM log_record
         ORDER BY id DESC
         LIMIT $1`,
        [limit]
      );
      const countRes = await client.query(`SELECT COUNT(*)::int AS c FROM log_record`);
      const total_for_date = Number(countRes.rows[0]?.c || 0);
      return NextResponse.json({
        success: true,
        data: {
          date: null,
          all: true,
          total_for_date,
          records: result.rows,
        },
      });
    }

    const dateParam = searchParams.get('date');
    const date =
      dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : getBusinessDayYmd();
    const result = await client.query(
      `SELECT
         id,
         created_at,
         business_date,
         table_label,
         action_type,
         original_amount,
         quantity,
         target_staff_label,
         item_name,
         ordered_at,
         payment_method,
         memo,
         session_id
       FROM log_record
       WHERE business_date = $1::date
       ORDER BY id DESC
       LIMIT $2`,
      [date, limit]
    );

    const countRes = await client.query(
      `SELECT COUNT(*)::int AS c FROM log_record WHERE business_date = $1::date`,
      [date]
    );
    const total_for_date = Number(countRes.rows[0]?.c || 0);

    return NextResponse.json({
      success: true,
      data: {
        date,
        all: false,
        total_for_date,
        records: result.rows,
      },
    });
  } catch (e) {
    console.error('log-records GET エラー:', e);
    return NextResponse.json({ success: false, error: 'ログの取得に失敗しました' }, { status: 500 });
  } finally {
    client.release();
  }
}
