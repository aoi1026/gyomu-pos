import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date'); // YYYY-MM-DD

    const params: any[] = [];
    const where = date ? `WHERE d.date = $1` : '';
    if (date) params.push(date);

    // テーブルが無い環境でも落ちにくくする（旧DB向けの保険）
    await client.query(`
      CREATE TABLE IF NOT EXISTS deduct (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        value DECIMAL(12,2) NOT NULL CHECK (value >= 0),
        reason TEXT,
        other TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const result = await client.query(
      `
      SELECT
        d.id,
        d.date::text AS date,
        d.value,
        d.reason,
        d.other,
        d.created_at,
        d.updated_at
      FROM deduct d
      ${where}
      ORDER BY d.date DESC, d.created_at DESC, d.id DESC
      `,
      params
    );

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('経費取得エラー:', error);
    return NextResponse.json({ success: false, error: '経費の取得に失敗しました' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const date = String(body?.date ?? '');
    const valueNum = Number(body?.value ?? 0);
    const reason = body?.reason !== undefined ? String(body.reason) : null;
    const other = body?.other !== undefined ? String(body.other) : null;

    if (!date) {
      return NextResponse.json({ success: false, error: 'date は必須です' }, { status: 400 });
    }
    if (!Number.isFinite(valueNum) || valueNum < 0) {
      return NextResponse.json({ success: false, error: 'value は0以上の数値が必要です' }, { status: 400 });
    }

    // テーブルが無い環境でも落ちにくくする（旧DB向けの保険）
    await client.query(`
      CREATE TABLE IF NOT EXISTS deduct (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        value DECIMAL(12,2) NOT NULL CHECK (value >= 0),
        reason TEXT,
        other TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const result = await client.query(
      `
      INSERT INTO deduct (date, value, reason, other)
      VALUES ($1, $2, $3, $4)
      RETURNING id, date::text AS date, value, reason, other, created_at, updated_at
      `,
      [date, valueNum, reason, other]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('経費保存エラー:', error);
    return NextResponse.json({ success: false, error: '経費の保存に失敗しました' }, { status: 500 });
  } finally {
    client.release();
  }
}


