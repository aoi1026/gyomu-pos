import { NextResponse } from 'next/server';
import { pool } from '@/lib/database';

/**
 * GET: 領収書用決済IDを発行（西暦＋月＋日＋連番3桁）
 * 例: 20250225001, 20250225002 ...
 */
export async function GET() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_variable (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        value TEXT,
        other TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const datePrefix = `${yyyy}${mm}${dd}`;

    const sel = await client.query(
      `SELECT value FROM project_variable WHERE name = 'receipt_payment_id_last'`
    );
    const lastValue = (sel.rows[0]?.value as string) || '';

    let nextSerial: number;
    if (lastValue.startsWith(datePrefix) && lastValue.length >= 11) {
      const serial = parseInt(lastValue.slice(8), 10);
      nextSerial = Number.isFinite(serial) ? serial + 1 : 1;
    } else {
      nextSerial = 1;
    }

    const serialStr = String(nextSerial).padStart(3, '0');
    const paymentId = `${datePrefix}${serialStr}`;

    await client.query(
      `INSERT INTO project_variable (name, value, other) VALUES ('receipt_payment_id_last', $1, '領収書決済ID 最終発行')
       ON CONFLICT (name) DO UPDATE SET value = $1`,
      [paymentId]
    );

    return NextResponse.json({ success: true, data: { paymentId } });
  } catch (e) {
    console.error('receipt-payment-id error:', e);
    return NextResponse.json(
      { success: false, error: '決済IDの発行に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
