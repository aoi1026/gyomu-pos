import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { pool } from '@/lib/database';

export async function GET(request: NextRequest) {
	const client = await pool.connect();
	try {
		const { searchParams } = new URL(request.url);
		const dateParam = searchParams.get('date');
		const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
			? dateParam
			: new Date().toISOString().split('T')[0];

		const ordersAgg = await client.query(
			`
			SELECT 
				COALESCE(SUM(total_price), 0) AS total_sales,
				COUNT(*)::int AS order_count
			FROM salesorder
			WHERE accepted_at >= $1::date
			  AND accepted_at < ($1::date + INTERVAL '1 day')
			`,
			[date]
		);

		const sessionsAgg = await client.query(
			`
			SELECT 
				COUNT(*)::int AS visitor_count,
				COALESCE(AVG(cost), 0) AS avg_cost
			FROM sessions
			WHERE created_at >= $1::date
			  AND created_at < ($1::date + INTERVAL '1 day')
			`,
			[date]
		);

		const total_sales = Number(ordersAgg.rows[0]?.total_sales || 0);
		const order_count = Number(ordersAgg.rows[0]?.order_count || 0);
		const visitor_count = Number(sessionsAgg.rows[0]?.visitor_count || 0);
		const avg_cost = Number(sessionsAgg.rows[0]?.avg_cost || 0);

		// テーブル別売上集計
		const tableSalesResult = await client.query(
			`
			SELECT 
				t.id AS table_id,
				t.name AS table_name,
				COALESCE(SUM(so.total_price), 0) AS total_sales
			FROM "table" t
			LEFT JOIN salesorder so
			  ON so.table_id = t.id
			 AND so.accepted_at >= $1::date
			 AND so.accepted_at < ($1::date + INTERVAL '1 day')
			GROUP BY t.id, t.name
			ORDER BY t.id
			`,
			[date]
		);

		// キャスト別売上集計（role が cast のみ）
		const castSalesResult = await client.query(
			`
			SELECT 
				u.id AS cast_id,
				u.name AS cast_name,
				COALESCE(SUM(so.total_price), 0) AS total_sales
			FROM "user" u
			LEFT JOIN salesorder so
			  ON so.cast_id = u.id
			 AND so.accepted_at >= $1::date
			 AND so.accepted_at < ($1::date + INTERVAL '1 day')
			WHERE u.role = 'cast'
			GROUP BY u.id, u.name
			ORDER BY u.id
			`,
			[date]
		);

		// 製品別売上（数量: total_price / unit_price の合計）
		const productSalesResult = await client.query(
			`
			SELECT 
				p.id AS product_id,
				p.name AS product_name,
				COALESCE(SUM(so.total_price), 0) AS total_sales,
				COALESCE(SUM(so.total_price / NULLIF(so.unit_price, 0)), 0) AS quantity
			FROM product p
			LEFT JOIN salesorder so
			  ON so.product_id = p.id
			 AND so.accepted_at >= $1::date
			 AND so.accepted_at < ($1::date + INTERVAL '1 day')
			GROUP BY p.id, p.name
			ORDER BY total_sales DESC, p.id
			`,
			[date]
		);

		return NextResponse.json({
			success: true,
			data: {
				date,
				total_sales,
				order_count,
				visitor_count,
				avg_cost,
				table_sales: tableSalesResult.rows,
				cast_sales: castSalesResult.rows,
				product_sales: productSalesResult.rows
			}
		});
	} catch (error) {
		console.error('日次売上集計エラー:', error);
		return NextResponse.json(
			{ success: false, error: '日次売上集計の取得に失敗しました' },
			{ status: 500 }
		);
	} finally {
		client.release();
	}
}


