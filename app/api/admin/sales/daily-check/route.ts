import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const year = Number(searchParams.get('year'));
    const month = Number(searchParams.get('month'));

    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return NextResponse.json({ success: false, error: 'year/month が不正です' }, { status: 400 });
    }

    // 旧DBでも落ちないための保険（列・テーブルが無いケース）
    await client.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS pay_type INTEGER`);
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

    const start = `${year}-${String(month).padStart(2, '0')}-01`;

    const result = await client.query(
      `
      WITH days AS (
        SELECT (d)::date AS day
        FROM generate_series($1::date, ($1::date + INTERVAL '1 month' - INTERVAL '1 day')::date, INTERVAL '1 day') d
      ),
      sess AS (
        SELECT
          s.created_at::date AS day,
          COALESCE(SUM(s.cost), 0) AS total_sales,
          COALESCE(SUM(CASE WHEN s.pay_type = 1 THEN s.cost ELSE 0 END), 0) AS cash_sales,
          COALESCE(SUM(CASE WHEN s.pay_type = 0 THEN s.cost ELSE 0 END), 0) AS store_card_sales,
          COALESCE(SUM(CASE WHEN s.pay_type = 2 THEN s.cost ELSE 0 END), 0) AS credit_card_sales,
          COALESCE(SUM(s.client), 0) AS customer_count
        FROM sessions s
        WHERE s.created_at >= $1::date
          AND s.created_at < ($1::date + INTERVAL '1 month')
        GROUP BY s.created_at::date
      ),
      nom AS (
        SELECT
          n.created_at::date AS day,
          COALESCE(SUM(n.cost_cast), 0) AS nomination_cost_cast
        FROM nomination n
        WHERE n.created_at >= $1::date
          AND n.created_at < ($1::date + INTERVAL '1 month')
        GROUP BY n.created_at::date
      ),
      so AS (
        SELECT
          so.accepted_at::date AS day,
          COALESCE(SUM(so.castsalary_price), 0) AS salesorder_castsalary
        FROM salesorder so
        WHERE so.status = 'accepted'
          AND so.for_cast = 1
          AND so.accepted_at IS NOT NULL
          AND so.accepted_at >= $1::date
          AND so.accepted_at < ($1::date + INTERVAL '1 month')
        GROUP BY so.accepted_at::date
      ),
      dd AS (
        SELECT
          d.date AS day,
          COALESCE(SUM(d.value), 0) AS deduct_total
        FROM deduct d
        WHERE d.date >= $1::date
          AND d.date < ($1::date + INTERVAL '1 month')
        GROUP BY d.date
      )
      SELECT
        days.day::text AS date,
        COALESCE(sess.total_sales, 0) AS total_sales,
        COALESCE(sess.cash_sales, 0) AS cash_sales,
        COALESCE(sess.store_card_sales, 0) AS store_card_sales,
        COALESCE(sess.credit_card_sales, 0) AS credit_card_sales,
        COALESCE(sess.customer_count, 0) AS customer_count,
        (COALESCE(nom.nomination_cost_cast, 0) + COALESCE(so.salesorder_castsalary, 0)) AS cast_salary,
        COALESCE(dd.deduct_total, 0) AS deduct_total
      FROM days
      LEFT JOIN sess ON sess.day = days.day
      LEFT JOIN nom ON nom.day = days.day
      LEFT JOIN so ON so.day = days.day
      LEFT JOIN dd ON dd.day = days.day
      ORDER BY days.day ASC
      `,
      [start]
    );

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('日別売上確認取得エラー:', error);
    return NextResponse.json({ success: false, error: '日別売上確認の取得に失敗しました' }, { status: 500 });
  } finally {
    client.release();
  }
}


