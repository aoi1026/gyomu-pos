import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = Number(searchParams.get('session_id'));
    if (!Number.isFinite(sessionId) || sessionId <= 0) {
      return NextResponse.json({ success: false, error: 'session_id が不正です' }, { status: 400 });
    }

    // 保険（旧DB）
    await client.query(`
      CREATE TABLE IF NOT EXISTS session_payments (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        pay_type INTEGER NOT NULL CHECK (pay_type IN (0, 1, 2)),
        amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
        other TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const result = await client.query(
      `
      SELECT id, session_id, pay_type, amount, other, created_at, updated_at
      FROM session_payments
      WHERE session_id = $1
      ORDER BY created_at ASC, id ASC
      `,
      [sessionId]
    );

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('決済履歴取得エラー:', error);
    return NextResponse.json({ success: false, error: '決済履歴の取得に失敗しました' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const sessionId = Number(body?.session_id);
    const payType = Number(body?.pay_type);
    const amount = Number(body?.amount);
    const other = body?.other !== undefined ? String(body.other) : null;

    if (!Number.isFinite(sessionId) || sessionId <= 0) {
      return NextResponse.json({ success: false, error: 'session_id が不正です' }, { status: 400 });
    }
    if (![0, 1, 2].includes(payType)) {
      return NextResponse.json({ success: false, error: 'pay_type が不正です' }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ success: false, error: 'amount は0以上の数値が必要です' }, { status: 400 });
    }

    // 保険（旧DB）
    await client.query(`
      CREATE TABLE IF NOT EXISTS session_payments (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        pay_type INTEGER NOT NULL CHECK (pay_type IN (0, 1, 2)),
        amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
        other TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const result = await client.query(
      `
      INSERT INTO session_payments (session_id, pay_type, amount, other)
      VALUES ($1, $2, $3, $4)
      RETURNING id, session_id, pay_type, amount, other, created_at, updated_at
      `,
      [sessionId, payType, amount, other]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('決済履歴保存エラー:', error);
    return NextResponse.json({ success: false, error: '決済履歴の保存に失敗しました' }, { status: 500 });
  } finally {
    client.release();
  }
}


