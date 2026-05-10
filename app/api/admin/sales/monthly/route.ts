import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { pool } from '@/lib/database';
import { businessDayStartExpr, businessDateExpr } from '@/lib/business-day-sql';
import { getBusinessMonth } from '@/lib/business-day';

export async function GET(request: NextRequest) {
	const client = await pool.connect();
	try {
		const { searchParams } = new URL(request.url);
		// デフォルトの「現在月」は業務月（朝6時 JST 起点）。
		const defaultBizMonth = getBusinessMonth();
		const [defaultYear, defaultMonth] = defaultBizMonth.split('-').map((s) => parseInt(s, 10));
		const year = Number(searchParams.get('year') || defaultYear);
		let month = Number(searchParams.get('month') || defaultMonth);
		if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) {
			return NextResponse.json({ success: false, error: 'Invalid year or month' }, { status: 400 });
		}

		const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
		const nextMonth = month === 12 ? 1 : month + 1;
		const nextYear = month === 12 ? year + 1 : year;
		const monthEnd = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

		// 業務月 = [当月1日 06:00 JST, 翌月1日 06:00 JST)
		// $1 = monthStart, $2 = monthEnd
		const BIZ_MONTH_START = businessDayStartExpr('$1');
		const BIZ_MONTH_END = businessDayStartExpr('$2');

		const salesAgg = await client.query(
			`
			SELECT 
				COALESCE(SUM(total_price), 0) AS total_sales,
				COUNT(*)::int AS order_count
			FROM salesorder
			WHERE accepted_at >= ${BIZ_MONTH_START}
			  AND accepted_at < ${BIZ_MONTH_END}
			`,
			[monthStart, monthEnd]
		);

		const sessionsAgg = await client.query(
			`
			SELECT 
				COALESCE(SUM(client), 0)::int AS visitor_count,
				COALESCE(AVG(cost), 0) AS avg_cost,
				COALESCE(SUM(cost), 0) AS sessions_total_cost
			FROM sessions
			WHERE created_at >= ${BIZ_MONTH_START}
			  AND created_at < ${BIZ_MONTH_END}
			`,
			[monthStart, monthEnd]
		);

		// カテゴリ別: 数量(sum total_price/unit_price), 売上合計(sum total_price)
		const categoryAgg = await client.query(
			`
			SELECT 
				c.id AS category_id,
				c.name AS category_name,
				COALESCE(SUM(so.total_price / NULLIF(so.unit_price, 0)), 0) AS quantity,
				COALESCE(SUM(so.total_price), 0) AS total_sales
			FROM category c
			LEFT JOIN product p ON p.category_id = c.id
			LEFT JOIN salesorder so 
			  ON so.product_id = p.id
			 AND so.accepted_at >= ${BIZ_MONTH_START}
			 AND so.accepted_at < ${BIZ_MONTH_END}
			GROUP BY c.id, c.name
			ORDER BY total_sales DESC, c.id
			`,
			[monthStart, monthEnd]
		);

		// 製品別: 数量(sum total_price/unit_price), 売上合計(sum total_price)
		const productAgg = await client.query(
			`
			SELECT 
				p.id AS product_id,
				p.name AS product_name,
				COALESCE(SUM(so.total_price / NULLIF(so.unit_price, 0)), 0) AS quantity,
				COALESCE(SUM(so.total_price), 0) AS total_sales
			FROM product p
			LEFT JOIN salesorder so 
			  ON so.product_id = p.id
			 AND so.accepted_at >= ${BIZ_MONTH_START}
			 AND so.accepted_at < ${BIZ_MONTH_END}
			GROUP BY p.id, p.name
			ORDER BY total_sales DESC, p.id
			`,
			[monthStart, monthEnd]
		);

		// 日別売上: 月内各業務日ごとの合計
		// 受注のタイムスタンプを業務日に変換してから当月日付シリーズと結合する。
		const dailyAgg = await client.query(
			`
			WITH days AS (
			  SELECT generate_series($1::date, ($2::date - INTERVAL '1 day')::date, '1 day')::date AS day
			)
			SELECT 
			  d.day::date AS day,
			  COALESCE(SUM(so.total_price), 0) AS total_sales
			FROM days d
			LEFT JOIN salesorder so
			  ON ${businessDateExpr('so.accepted_at')} = d.day
			GROUP BY d.day
			ORDER BY d.day
			`,
			[monthStart, monthEnd]
		);

		// キャスト別: 売上合計(sum total_price)
		const castAgg = await client.query(
			`
			SELECT 
				u.id AS cast_id,
				u.name AS cast_name,
				COALESCE(SUM(so.total_price), 0) AS total_sales
			FROM "user" u
			LEFT JOIN salesorder so
			  ON so.cast_id = u.id
			 AND so.accepted_at >= ${BIZ_MONTH_START}
			 AND so.accepted_at < ${BIZ_MONTH_END}
			WHERE u.role = 'cast'
			GROUP BY u.id, u.name
			ORDER BY total_sales DESC, u.id
			`,
			[monthStart, monthEnd]
		);

		return NextResponse.json({
			success: true,
			data: {
				year,
				month,
				total_sales: Number(salesAgg.rows[0]?.total_sales || 0),
				order_count: Number(salesAgg.rows[0]?.order_count || 0),
				visitor_count: Number(sessionsAgg.rows[0]?.visitor_count || 0),
				avg_cost: Number(sessionsAgg.rows[0]?.avg_cost || 0),
				sessions_total_cost: Number(sessionsAgg.rows[0]?.sessions_total_cost || 0),
				category_sales: categoryAgg.rows,
				product_sales: productAgg.rows,
				cast_sales: castAgg.rows,
				daily_sales: dailyAgg.rows
			}
		});
	} catch (error) {
		console.error('月次売上集計エラー:', error);
		return NextResponse.json(
			{ success: false, error: '月次売上集計の取得に失敗しました' },
			{ status: 500 }
		);
	} finally {
		client.release();
	}
}


