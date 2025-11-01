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

		const result = await client.query(
			`
			WITH hours AS (
				SELECT generate_series(0, 23) AS hour
			)
			SELECT 
				h.hour::int AS hour,
				COALESCE(SUM(so.total_price), 0) AS total_sales,
				COALESCE(COUNT(DISTINCT so.product_id), 0) AS distinct_products
			FROM hours h
			LEFT JOIN salesorder so
			  ON so.accepted_at >= $1::date
			 AND so.accepted_at < ($1::date + INTERVAL '1 day')
			 AND EXTRACT(HOUR FROM so.accepted_at) = h.hour
			GROUP BY h.hour
			ORDER BY h.hour
			`,
			[date]
		);

		return NextResponse.json({
			success: true,
			data: {
				date,
				hours: result.rows
			}
		});
	} catch (error) {
		console.error('時間別売上集計エラー:', error);
		return NextResponse.json(
			{ success: false, error: '時間別売上集計の取得に失敗しました' },
			{ status: 500 }
		);
	} finally {
		client.release();
	}
}


