import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { pool } from '@/lib/database';
import { businessDayStartExpr, businessDayPlusExpr } from '@/lib/business-day-sql';
import { getBusinessDayYmd } from '@/lib/business-day';

// 業務日（朝6時 JST 境界）。$1 = 業務日 YYYY-MM-DD。
//   開始 = $1 06:00 JST
//   終端 = ($1 + 1 日) 06:00 JST （排他的）
const BIZ_DAY_START = businessDayStartExpr('$1');
const BIZ_DAY_END = businessDayPlusExpr('$1', 1);

export async function GET(request: NextRequest) {
	const client = await pool.connect();
	try {
		const { searchParams } = new URL(request.url);
		const dateParam = searchParams.get('date');
		// デフォルト「今日」は業務日（朝6時 JST 起点）。深夜営業帯でも当日扱い。
		const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
			? dateParam
			: getBusinessDayYmd();

		// 旧DB向けの最低限の保険（決済履歴）
		await client.query(`
			CREATE TABLE IF NOT EXISTS session_payments (
				id SERIAL PRIMARY KEY,
				session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
				pay_type INTEGER NOT NULL CHECK (pay_type IN (0, 1, 2)),
				amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
				other TEXT,
				created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
			)
		`);

		const ordersAgg = await client.query(
			`
			SELECT 
				COALESCE(SUM(total_price), 0) AS total_sales,
				COUNT(*)::int AS order_count
			FROM salesorder
			WHERE accepted_at >= ${BIZ_DAY_START}
			  AND accepted_at < ${BIZ_DAY_END}
			`,
			[date]
		);

		const sessionsAgg = await client.query(
			`
			SELECT 
				COALESCE(SUM(client), 0)::int AS visitor_count,
				COALESCE(AVG(cost), 0) AS avg_cost,
				COALESCE(SUM(cost), 0) AS sessions_total_cost
			FROM sessions
			WHERE created_at >= ${BIZ_DAY_START}
			  AND created_at < ${BIZ_DAY_END}
			`,
			[date]
		);

		// session_paymentsテーブルから本日のamount合計を取得（業務日基準）
		const sessionPaymentsAgg = await client.query(
			`
			SELECT 
				COALESCE(SUM(amount), 0) AS total_payments,
				COALESCE(SUM(CASE WHEN pay_type IN (0, 2) THEN amount ELSE 0 END), 0) AS card_payments,
				COALESCE(SUM(CASE WHEN pay_type = 1 THEN amount ELSE 0 END), 0) AS cash_payments
			FROM session_payments
			WHERE created_at >= ${BIZ_DAY_START}
			  AND created_at < ${BIZ_DAY_END}
			`,
			[date]
		);

		// 性別カラム（勤務人員の男女集計用）
		await client.query(`
			ALTER TABLE "user" ADD COLUMN IF NOT EXISTS gender VARCHAR(10)
		`);

		// 業務日（他集計と同じ 06:00 JST 〜翌 06:00）に出勤した人数
		// - cast_count: 勤怠 status=saved のキャスト（role=cast）のユニーク人数
		// - male/female: 同じ勤怠の出勤者全体から性別が male / female のユニーク人数
		const attendanceStatsResult = await client.query(
			`
			SELECT
				COALESCE(COUNT(DISTINCT CASE WHEN u.role = 'cast' THEN a.staff_id END), 0)::int AS cast_count,
				COALESCE(COUNT(DISTINCT CASE WHEN u.gender = 'male' THEN a.staff_id END), 0)::int AS male_count,
				COALESCE(COUNT(DISTINCT CASE WHEN u.gender = 'female' THEN a.staff_id END), 0)::int AS female_count
			FROM attendance a
			INNER JOIN "user" u ON u.id = a.staff_id
			WHERE a.clock_in >= ${BIZ_DAY_START}
			  AND a.clock_in < ${BIZ_DAY_END}
			  AND a.status = 'saved'
			`,
			[date]
		);

		// 月間残高総額（該当業務月の1日から指定業務日までの粗利益の合計）
		const firstDayOfMonth = date.substring(0, 7) + '-01';
		
		// deductテーブルの存在確認と作成
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

		// $1 = firstDayOfMonth, $2 = date 。業務日 [$1 00:00..$2+1 06:00 JST]
		const monthlyPaymentsResult = await client.query(
			`
			SELECT 
				COALESCE(SUM(amount), 0) AS monthly_total_payments
			FROM session_payments
			WHERE created_at >= ${businessDayStartExpr('$1')}
			  AND created_at <  ${businessDayPlusExpr('$2', 1)}
			`,
			[firstDayOfMonth, date]
		);

		const monthlyDeductsResult = await client.query(
			`
			SELECT 
				COALESCE(SUM(value), 0) AS monthly_total_deducts
			FROM deduct
			WHERE date >= $1::date
			  AND date <= $2::date
			`,
			[firstDayOfMonth, date]
		);

		const total_sales = Number(ordersAgg.rows[0]?.total_sales || 0);
		const order_count = Number(ordersAgg.rows[0]?.order_count || 0);
		const visitor_count = Number(sessionsAgg.rows[0]?.visitor_count || 0);
		const avg_cost = Number(sessionsAgg.rows[0]?.avg_cost || 0);
		const sessions_total_cost = Number(sessionsAgg.rows[0]?.sessions_total_cost || 0);
		const total_payments = Number(sessionPaymentsAgg.rows[0]?.total_payments || 0);
		const card_payments = Number(sessionPaymentsAgg.rows[0]?.card_payments || 0);
		const cash_payments = Number(sessionPaymentsAgg.rows[0]?.cash_payments || 0);
		const cast_count = Number(attendanceStatsResult.rows[0]?.cast_count || 0);
		const male_attendance_count = Number(attendanceStatsResult.rows[0]?.male_count || 0);
		const female_attendance_count = Number(attendanceStatsResult.rows[0]?.female_count || 0);
		const monthly_total_payments = Number(monthlyPaymentsResult.rows[0]?.monthly_total_payments || 0);
		const monthly_total_deducts = Number(monthlyDeductsResult.rows[0]?.monthly_total_deducts || 0);
		const monthly_gross_profit = monthly_total_payments - monthly_total_deducts;

		// テーブル別売上集計（業務日基準・完了セッションのみ）
		// status = 0 が完了済みセッション。
		// 完了時刻 (end_at) が業務日内かどうかで判定し、end_at が NULL の場合は created_at にフォールバック。
		const tableSalesResult = await client.query(
			`
			WITH sess AS (
				SELECT id, table_id, cost
				FROM sessions
				WHERE status = 0
				  AND COALESCE(end_at, created_at) >= ${BIZ_DAY_START}
				  AND COALESCE(end_at, created_at) < ${BIZ_DAY_END}
			),
			pay AS (
				SELECT sp.session_id, COALESCE(SUM(sp.amount), 0) AS pay_total
				FROM session_payments sp
				INNER JOIN sess s ON s.id = sp.session_id
				GROUP BY sp.session_id
			),
			sess_paid AS (
				SELECT
					s.table_id,
					CASE
						WHEN p.session_id IS NOT NULL THEN COALESCE(p.pay_total, 0)
						ELSE COALESCE(s.cost, 0)
					END AS paid_total
				FROM sess s
				LEFT JOIN pay p ON p.session_id = s.id
			)
			SELECT
				t.id AS table_id,
				t.name AS table_name,
				COALESCE(SUM(spd.paid_total), 0) AS total_sales,
				COUNT(spd.paid_total) AS session_count
			FROM "table" t
			LEFT JOIN sess_paid spd ON spd.table_id = t.id
			GROUP BY t.id, t.name
			ORDER BY t.id
			`,
			[date]
		);

		// キャスト別売上集計（業務日基準, role が cast のみ）
		const castSalesResult = await client.query(
			`
			SELECT 
				u.id AS cast_id,
				u.name AS cast_name,
				COALESCE(SUM(so.total_price), 0) AS total_sales
			FROM "user" u
			LEFT JOIN salesorder so
			  ON so.cast_id = u.id
			 AND so.accepted_at >= ${BIZ_DAY_START}
			 AND so.accepted_at < ${BIZ_DAY_END}
			WHERE u.role = 'cast'
			GROUP BY u.id, u.name
			ORDER BY u.id
			`,
			[date]
		);

		// 製品別売上（業務日基準, 数量: total_price / unit_price の合計）
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
			 AND so.accepted_at >= ${BIZ_DAY_START}
			 AND so.accepted_at < ${BIZ_DAY_END}
			GROUP BY p.id, p.name
			ORDER BY total_sales DESC, p.id
			`,
			[date]
		);

		// 時間別売上集計（業務日基準, 1時間ごと, JST の時刻で集計）
		const hourlySalesResult = await client.query(
			`
			SELECT 
				EXTRACT(HOUR FROM (so.accepted_at AT TIME ZONE 'Asia/Tokyo'))::int AS hour,
				COALESCE(SUM(so.total_price), 0) AS total_sales,
				COUNT(*)::int AS order_count
			FROM salesorder so
			WHERE so.accepted_at >= ${BIZ_DAY_START}
			  AND so.accepted_at < ${BIZ_DAY_END}
			GROUP BY EXTRACT(HOUR FROM (so.accepted_at AT TIME ZONE 'Asia/Tokyo'))
			ORDER BY hour
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
				sessions_total_cost,
				total_payments,
				card_payments,
				cash_payments,
				cast_count,
				male_attendance_count,
				female_attendance_count,
				monthly_gross_profit,
				table_sales: tableSalesResult.rows,
				cast_sales: castSalesResult.rows,
				product_sales: productSalesResult.rows,
				hourly_sales: hourlySalesResult.rows
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


