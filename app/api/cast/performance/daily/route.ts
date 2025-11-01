import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { pool } from '@/lib/database';

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const userId = Number(searchParams.get('user_id'));
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    if (!userId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ success: false, error: 'user_id and valid date are required' }, { status: 400 });
    }

    const mainInside = await client.query(
      `
      SELECT 
        SUM(CASE WHEN s.nomination_type = 'main' THEN 1 ELSE 0 END)::int AS main_count,
        SUM(CASE WHEN s.nomination_type = 'inside' THEN 1 ELSE 0 END)::int AS inside_count,
        COALESCE(SUM(s.cost), 0) AS total_session_cost
      FROM sessions s
      WHERE s.cast_id = $1
        AND s.created_at >= $2::date
        AND s.created_at < ($2::date + INTERVAL '1 day')
      `,
      [userId, date]
    );

    const salesAgg = await client.query(
      `
      SELECT 
        COALESCE(SUM(so.total_price), 0) AS total_sales
      FROM salesorder so
      WHERE so.cast_id = $1
        AND so.accepted_at >= $2::date
        AND so.accepted_at < ($2::date + INTERVAL '1 day')
      `,
      [userId, date]
    );

    const bottleAgg = await client.query(
      `
      SELECT 
        COALESCE(SUM(so.total_price), 0) AS bottle_sales
      FROM salesorder so
      JOIN product p ON p.id = so.product_id
      WHERE so.cast_id = $1
        AND so.accepted_at >= $2::date
        AND so.accepted_at < ($2::date + INTERVAL '1 day')
        AND p.category_id = 1
      `,
      [userId, date]
    );

    const products = await client.query(
      `
      SELECT 
        p.id AS product_id,
        p.name AS product_name,
        COALESCE(SUM(so.amount), 0)::int AS quantity,
        COALESCE(SUM(so.total_price), 0) AS total_amount
      FROM salesorder so
      JOIN product p ON p.id = so.product_id
      WHERE so.cast_id = $1
        AND so.accepted_at >= $2::date
        AND so.accepted_at < ($2::date + INTERVAL '1 day')
      GROUP BY p.id, p.name
      ORDER BY total_amount DESC, p.name
      `,
      [userId, date]
    );

    const main_count = Number(mainInside.rows[0]?.main_count || 0);
    const inside_count = Number(mainInside.rows[0]?.inside_count || 0);
    const total_sales = Number(salesAgg.rows[0]?.total_sales || 0);
    const bottle_sales = Number(bottleAgg.rows[0]?.bottle_sales || 0);

    return NextResponse.json({
      success: true,
      data: {
        date,
        user_id: userId,
        main_count,
        inside_count,
        total_sales,
        bottle_sales,
        products: products.rows
      }
    });
  } catch (error) {
    console.error('キャスト日次実績取得エラー:', error);
    return NextResponse.json({ success: false, error: '日次実績の取得に失敗しました' }, { status: 500 });
  } finally {
    client.release();
  }
}


