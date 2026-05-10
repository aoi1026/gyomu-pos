import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { pool } from '@/lib/database';
import { businessDayStartExpr, businessDayPlusExpr } from '@/lib/business-day-sql';
import { getBusinessDayYmd } from '@/lib/business-day';

export async function GET(request: NextRequest) {
	const client = await pool.connect();
	try {
		const { searchParams } = new URL(request.url);
		const dateParam = searchParams.get('date');
		// 業務日（朝6時 JST 起点）を既定値とする。
		const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
			? dateParam
			: getBusinessDayYmd();

		// 業務日 [$1 06:00 JST, $1+1日 06:00 JST) の範囲内で時間別 (JST) に集計する。
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
			  ON so.accepted_at >= ${businessDayStartExpr('$1')}
			 AND so.accepted_at <  ${businessDayPlusExpr('$1', 1)}
			 AND EXTRACT(HOUR FROM (so.accepted_at AT TIME ZONE 'Asia/Tokyo')) = h.hour
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


