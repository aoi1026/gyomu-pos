import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';
import type { PoolClient } from 'pg';

export const dynamic = 'force-dynamic';

/**
 * session_payments テーブルの存在保証 + 旧スキーマからの拡張カラム追加。
 * - fee_rate: カード決済時の手数料率 (%). 現金は 0。
 * - fee_amount: 手数料の金額 (¥)。amount に含まれる「手数料分」の内訳。
 *   請求合計への充当額 = amount - fee_amount。
 */
async function ensureSessionPaymentsTable(client: PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS session_payments (
      id SERIAL PRIMARY KEY,
      session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      pay_type INTEGER NOT NULL CHECK (pay_type IN (0, 1, 2)),
      amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
      fee_rate DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (fee_rate >= 0 AND fee_rate <= 100),
      fee_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (fee_amount >= 0),
      other TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await client.query(`
    ALTER TABLE session_payments
      ADD COLUMN IF NOT EXISTS fee_rate DECIMAL(5,2) NOT NULL DEFAULT 0
  `);
  await client.query(`
    ALTER TABLE session_payments
      ADD COLUMN IF NOT EXISTS fee_amount DECIMAL(12,2) NOT NULL DEFAULT 0
  `);
}

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = Number(searchParams.get('session_id'));
    if (!Number.isFinite(sessionId) || sessionId <= 0) {
      return NextResponse.json({ success: false, error: 'session_id が不正です' }, { status: 400 });
    }

    await ensureSessionPaymentsTable(client);

    const result = await client.query(
      `
      SELECT id, session_id, pay_type, amount, fee_rate, fee_amount, other, created_at, updated_at
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
    const feeRateRaw = body?.fee_rate;
    const feeAmountRaw = body?.fee_amount;
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

    const feeRate = feeRateRaw === undefined || feeRateRaw === null ? 0 : Number(feeRateRaw);
    if (!Number.isFinite(feeRate) || feeRate < 0 || feeRate > 100) {
      return NextResponse.json({ success: false, error: 'fee_rate は 0〜100 の数値が必要です' }, { status: 400 });
    }
    const feeAmount = feeAmountRaw === undefined || feeAmountRaw === null ? 0 : Number(feeAmountRaw);
    if (!Number.isFinite(feeAmount) || feeAmount < 0) {
      return NextResponse.json({ success: false, error: 'fee_amount は 0 以上の数値が必要です' }, { status: 400 });
    }
    if (feeAmount > amount) {
      return NextResponse.json(
        { success: false, error: 'fee_amount は amount を超えてはいけません' },
        { status: 400 }
      );
    }
    if (payType === 1 && (feeRate > 0 || feeAmount > 0)) {
      return NextResponse.json(
        { success: false, error: '現金決済には手数料を設定できません' },
        { status: 400 }
      );
    }

    await ensureSessionPaymentsTable(client);

    const result = await client.query(
      `
      INSERT INTO session_payments (session_id, pay_type, amount, fee_rate, fee_amount, other)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, session_id, pay_type, amount, fee_rate, fee_amount, other, created_at, updated_at
      `,
      [sessionId, payType, amount, feeRate, feeAmount, other]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('決済履歴保存エラー:', error);
    return NextResponse.json({ success: false, error: '決済履歴の保存に失敗しました' }, { status: 500 });
  } finally {
    client.release();
  }
}


