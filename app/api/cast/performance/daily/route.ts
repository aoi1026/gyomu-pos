import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const userId = Number(searchParams.get('user_id'));
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    if (!userId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ success: false, error: 'user_id and valid date are required' }, { status: 400 });
    }

    const nominations = await client.query(
      `
      SELECT 
        COUNT(*) FILTER (WHERE n.type_id = 'main')::int AS main_count,
        COUNT(*) FILTER (WHERE n.type_id = 'inside')::int AS inside_count,
        COUNT(*) FILTER (WHERE n.type_id = 'together')::int AS together_count
      FROM nomination n
      WHERE n.cast_id = $1
        AND n.created_at >= $2::date
        AND n.created_at < ($2::date + INTERVAL '1 day')
      `,
      [userId, date]
    );

    const drinkSales = await client.query(
      `
      SELECT 
        COALESCE(SUM(so.total_price), 0) AS drink_sales
      FROM salesorder so
      JOIN product p ON p.id = so.product_id
      WHERE so.cast_id = $1
        AND so.for_cast = 1
        AND so.status = 'accepted'
        AND so.accepted_at >= $2::date
        AND so.accepted_at < ($2::date + INTERVAL '1 day')
        AND p.category_id IN (1, 2)
      `,
      [userId, date]
    );

    const foodSales = await client.query(
      `
      SELECT 
        COALESCE(SUM(so.total_price), 0) AS food_sales
      FROM salesorder so
      JOIN product p ON p.id = so.product_id
      WHERE so.cast_id = $1
        AND so.for_cast = 1
        AND so.status = 'accepted'
        AND so.accepted_at >= $2::date
        AND so.accepted_at < ($2::date + INTERVAL '1 day')
        AND p.category_id = 3
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

    const main_count = Number(nominations.rows[0]?.main_count || 0);
    const inside_count = Number(nominations.rows[0]?.inside_count || 0);
    const together_count = Number(nominations.rows[0]?.together_count || 0);
    const drink_sales = Number(drinkSales.rows[0]?.drink_sales || 0);
    const food_sales = Number(foodSales.rows[0]?.food_sales || 0);

    return NextResponse.json({
      success: true,
      data: {
        date,
        user_id: userId,
        main_count,
        inside_count,
        together_count,
        drink_sales,
        food_sales,
        total_sales: drink_sales + food_sales,
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


