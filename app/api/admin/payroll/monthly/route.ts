import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';
import { businessDayStartExpr, businessDayPlusExpr } from '@/lib/business-day-sql';

function ymStart(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

// 業務日（朝6時 JST 境界）で範囲を絞る共通条件式
//   $1 = rangeStart (業務日 YYYY-MM-DD)
//   $2 = rangeEndExclusive (業務日 YYYY-MM-DD、排他的)
//   業務日 D の時間範囲 = [D 06:00 JST, (D+1) 06:00 JST)
const BIZ_RANGE_START = businessDayStartExpr('$1');
const BIZ_RANGE_END = businessDayStartExpr('$2');

function addDays(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export async function GET(request: NextRequest) {
  let client;
  try {
    // 接続タイムアウトを設定
    client = await Promise.race([
      pool.connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 10000)
      )
    ]) as any;
  } catch (connectError: any) {
    console.error('データベース接続エラー:', connectError);
    return NextResponse.json(
      { 
        success: false, 
        error: 'データベースに接続できませんでした。データベースサーバーが起動しているか確認してください。' 
      }, 
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    const dateParam = searchParams.get('date');

    let mode: 'month' | 'range' | 'date' = 'month';
    let rangeStart: string;
    let rangeEndExclusive: string;
    let year: number | null = null;
    let month: number | null = null;
    let useSalary = true;

    if (dateParam) {
      mode = 'date';
      const next = addDays(dateParam, 1);
      if (!next) return NextResponse.json({ success: false, error: 'Invalid date' }, { status: 400 });
      rangeStart = dateParam;
      rangeEndExclusive = next;
      useSalary = false;
    } else if (startParam && endParam) {
      mode = 'range';
      // inclusive end -> exclusive end+1 day
      let s = startParam;
      let e = endParam;
      if (s > e) [s, e] = [e, s];
      const next = addDays(e, 1);
      if (!next) return NextResponse.json({ success: false, error: 'Invalid start/end' }, { status: 400 });
      rangeStart = s;
      rangeEndExclusive = next;
      useSalary = false;
    } else {
      // month mode
      year = Number(searchParams.get('year') || now.getFullYear());
      month = Number(searchParams.get('month') || (now.getMonth() + 1));
    if (!year || !month || month < 1 || month > 12) {
      return NextResponse.json({ success: false, error: 'Invalid year or month' }, { status: 400 });
    }
      rangeStart = ymStart(year, month);
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      rangeEndExclusive = ymStart(nextYear, nextMonth);
      useSalary = true;
    }

    // マスタ取得（カテゴリ・指名単価）
    const [categoriesRes, chargesRes] = await Promise.all([
      client.query(`SELECT id, name FROM category ORDER BY id`),
      client.query(
        `SELECT charge_name, COALESCE(value, 0) AS value FROM add_charges WHERE charge_name IN ('main','inside','together')`
      ),
    ]);
    const categories = categoriesRes.rows as Array<{ id: number; name: string }>;
    const charges: Record<string, number> = {};
    for (const r of chargesRes.rows) charges[String(r.charge_name)] = Number(r.value) || 0;

    let result: { rows: any[] };
    let catBackMap: Record<string, Record<string, number>> = {};

    if (mode === 'date') {
      // 単日: 従来の集計SQLで1日分を取得し、salary_daily があればその行で上書き
      const dateModeSql = `
      WITH casts AS (
        SELECT id AS user_id, name, mail AS email,
               hourly_price, main_nomination, inside_nomination, together_nomination
        FROM "user"
        WHERE role = 'cast'
      ),
      att AS (
        SELECT
          a.staff_id AS user_id,
          COALESCE(SUM(
            CASE
              WHEN a.clock_out IS NULL THEN EXTRACT(EPOCH FROM (NOW() - a.clock_in)) / 3600.0
              ELSE COALESCE(a.total_work_hours, EXTRACT(EPOCH FROM (a.clock_out - a.clock_in)) / 3600.0)
            END
          ), 0) AS hours,
          COALESCE(SUM(
            CASE
              WHEN a.clock_out IS NULL THEN FLOOR(GREATEST(0, EXTRACT(EPOCH FROM (NOW() - a.clock_in)) / 60.0) / 15.0) * 0.25
              ELSE FLOOR(GREATEST(0, COALESCE(a.total_work_hours, EXTRACT(EPOCH FROM (a.clock_out - a.clock_in)) / 3600.0)) * 4.0) / 4.0
            END
          ), 0) AS paid_hours
        FROM attendance a
        -- 業務日（朝6時 JST 起点）で絞り込む。深夜営業を跨いでも同じ業務日に収まる。
        WHERE a.clock_in >= ${BIZ_RANGE_START} AND a.clock_in < ${BIZ_RANGE_END}
        GROUP BY a.staff_id
      ),
      ext_events AS (
        SELECT s.id AS session_id,
               (e->>'timestamp')::bigint AS ts_ms
        FROM sessions s
        CROSS JOIN LATERAL jsonb_array_elements(COALESCE(s.set_extensions, '[]'::jsonb)) e
        WHERE (e->>'timestamp') IS NOT NULL
          AND to_timestamp(((e->>'timestamp')::numeric)/1000) >= ${BIZ_RANGE_START}
          AND to_timestamp(((e->>'timestamp')::numeric)/1000) < ${BIZ_RANGE_END}
      ),
      nom AS (
        SELECT 
          n.cast_id AS user_id, 
          SUM(CASE WHEN n.type_id = 'main' THEN 1 ELSE 0 END)::int AS main_cnt,
          SUM(CASE WHEN n.type_id = 'inside' THEN 1 ELSE 0 END)::int AS inside_cnt,
          SUM(CASE WHEN n.type_id = 'together' THEN 1 ELSE 0 END)::int AS together_cnt,
          SUM(CASE WHEN n.type_id IN ('main','together') THEN COALESCE(ext_after.cnt, 0) ELSE 0 END)::int AS main_ext_cnt,
          SUM(CASE WHEN n.type_id = 'inside' THEN COALESCE(ext_after.cnt, 0) ELSE 0 END)::int AS inside_ext_cnt
        FROM nomination n
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS cnt
          FROM ext_events ee
          WHERE ee.session_id = n.session_id
            AND ee.ts_ms > (EXTRACT(EPOCH FROM n.created_at) * 1000)::bigint
        ) ext_after ON TRUE
        WHERE n.created_at >= ${BIZ_RANGE_START} AND n.created_at < ${BIZ_RANGE_END}
        GROUP BY n.cast_id
      )
      SELECT 
        c.user_id,
        c.name,
        c.email,
        COALESCE(att.hours, 0)::DECIMAL(10,2) AS basic_hours,
        c.hourly_price,
        c.main_nomination,
        c.inside_nomination,
        c.together_nomination,
        (COALESCE(att.paid_hours, 0) * COALESCE(c.hourly_price, 0))::DECIMAL(12,2) AS base_pay,
        COALESCE(nom.main_cnt, 0) AS main_nomination_count,
        COALESCE(nom.main_ext_cnt, 0) AS main_nomination_extension_count,
        COALESCE(nom.inside_cnt, 0) AS inside_nomination_count,
        COALESCE(nom.inside_ext_cnt, 0) AS inside_nomination_extension_count,
        COALESCE(nom.together_cnt, 0) AS together_nomination_count,
        0::DECIMAL(12,2) AS pickup_yen,
        0::DECIMAL(12,2) AS hairmake_yen,
        0::DECIMAL(12,2) AS rental_yen,
        0::DECIMAL(12,2) AS other_deduct_yen,
        0::DECIMAL(12,2) AS penalty_yen,
        0::DECIMAL(12,2) AS bonus_yen,
        0::DECIMAL(12,2) AS point_yen,
        0::DECIMAL(12,2) AS additional_point_yen,
        0::DECIMAL(12,2) AS paid_price
      FROM casts c
      LEFT JOIN att att ON att.user_id = c.user_id
      LEFT JOIN nom nom ON nom.user_id = c.user_id
      ORDER BY c.name
      `;
      const [dateResult, sdRes, catBackRes] = await Promise.all([
        client.query(dateModeSql, [rangeStart, rangeEndExclusive]),
        client.query(`SELECT * FROM salary_daily WHERE date = $1::date`, [rangeStart]).catch(() => ({ rows: [] })),
        client.query(
          `SELECT so.cast_id AS user_id, p.category_id,
             COALESCE(SUM(so.amount), 0)::INT AS sum_amount,
             COALESCE(SUM(so.castsalary_price), 0)::DECIMAL(12,2) AS sum_yen
           FROM salesorder so INNER JOIN product p ON p.id = so.product_id
           WHERE so.status = 'accepted' AND so.for_cast = 1 AND so.cast_id IS NOT NULL
             -- 業務日（朝6時 JST 起点）
             AND so.accepted_at >= ${BIZ_RANGE_START} AND so.accepted_at < ${BIZ_RANGE_END}
           GROUP BY so.cast_id, p.category_id`,
          [rangeStart, rangeEndExclusive]
        ),
      ]);
      const sdByUser: Record<string, any> = {};
      for (const row of (sdRes.rows as any[])) {
        sdByUser[String(row.user_id)] = row;
      }
      const catAmountMap: Record<string, Record<string, number>> = {};
      for (const r of catBackRes.rows as any[]) {
        const uid = String(r.user_id);
        const cid = String(r.category_id);
        if (!catBackMap[uid]) catBackMap[uid] = {};
        if (!catAmountMap[uid]) catAmountMap[uid] = {};
        catBackMap[uid][cid] = Number(r.sum_yen) || 0;
        catAmountMap[uid][cid] = Number(r.sum_amount) || 0;
      }
      result = {
        rows: (dateResult.rows as any[]).map((r) => {
          const uid = String(r.user_id);
          const sd = sdByUser[uid];
          if (sd) {
            const categoryTotals = sd.category_totals && typeof sd.category_totals === 'object' ? sd.category_totals : {};
            const categoryAmounts = catAmountMap[uid] || {};
            const sales_back_yen = Object.values(categoryTotals).reduce((s: number, x: any) => s + (Number(x) || 0), 0);
            const basePay = Number(r.base_pay || 0);
            const bonus = Number(sd.bonus_yen || 0);
            const point = Number(sd.point_yen || 0);
            const addPoint = Number(sd.additional_point_yen || 0);
            const backTotal = Number(sd.back_total || 0);
            const totalPay = basePay + backTotal + bonus + point + addPoint;
            const paid = Number(sd.paid_price || 0);
            return {
              user_id: r.user_id,
              name: r.name,
              email: r.email,
              basic_hours: Number(r.basic_hours || sd.basic_hours || 0),
              hourly_price: Number(sd.hourly_price || 0),
              main_nomination: r.main_nomination,
              inside_nomination: r.inside_nomination,
              together_nomination: r.together_nomination,
              base_pay: basePay,
              main_nomination_count: Number(sd.main_nomination_count || 0),
              main_nomination_extension_count: Number(sd.main_nomination_extension_count || 0),
              inside_nomination_count: Number(sd.inside_nomination_count || 0),
              inside_nomination_extension_count: Number(sd.inside_nomination_extension_count || 0),
              together_nomination_count: Number(sd.together_nomination_count || 0),
              paid_price: paid,
              pickup_yen: Number(sd.pickup_yen || 0),
              hairmake_yen: Number(sd.hairmake_yen || 0),
              rental_yen: Number(sd.rental_yen || 0),
              other_deduct_yen: Number(sd.other_deduct_yen || 0),
              penalty_yen: Number(sd.penalty_yen || 0),
              bonus_yen: bonus,
              point_yen: point,
              additional_point_yen: addPoint,
              categoryTotals,
              categoryAmounts,
              main_nomination_fee: Number(sd.main_nomination_fee || 0),
              main_nomination_extension_fee: Number(sd.main_nomination_extension_fee || 0),
              inside_nomination_fee: Number(sd.inside_nomination_fee || 0),
              inside_nomination_extension_fee: Number(sd.inside_nomination_extension_fee || 0),
              together_nomination_fee: Number(sd.together_nomination_fee || 0),
              sales_back_yen,
              back_total: backTotal,
              deduction_yen: Number(sd.deduction_yen || 0),
              total_pay_yen: totalPay,
              realTotal_price: totalPay - paid,
              _fromSalaryDaily: true,
            };
          }
          return { ...r, categoryTotals: catBackMap[uid] || {}, categoryAmounts: catAmountMap[uid] || {} };
        }),
      };
    } else if (mode === 'month' || mode === 'range') {
      // 月/範囲: salary_daily の集計を利用。カテゴリ列は salesorder から amount・castsalary を取得
      const [castsRes, aggRes, catAggRes, catSalesRes, liveAttRes] = await Promise.all([
        client.query(
          `SELECT id AS user_id, name, mail AS email, hourly_price, main_nomination, inside_nomination, together_nomination FROM "user" WHERE role = 'cast' ORDER BY name`
        ),
        client.query(
          `SELECT user_id,
            COALESCE(SUM(basic_hours), 0)::DECIMAL(10,2) AS basic_hours,
            COALESCE(SUM(paid_price), 0)::DECIMAL(12,2) AS paid_price,
            COALESCE(SUM(pickup_yen), 0)::DECIMAL(12,2) AS pickup_yen,
            COALESCE(SUM(hairmake_yen), 0)::DECIMAL(12,2) AS hairmake_yen,
            COALESCE(SUM(rental_yen), 0)::DECIMAL(12,2) AS rental_yen,
            COALESCE(SUM(other_deduct_yen), 0)::DECIMAL(12,2) AS other_deduct_yen,
            COALESCE(SUM(penalty_yen), 0)::DECIMAL(12,2) AS penalty_yen,
            COALESCE(SUM(deduction_yen), 0)::DECIMAL(12,2) AS deduction_yen,
            COALESCE(SUM(base_pay), 0)::DECIMAL(12,2) AS base_pay,
            COALESCE(SUM(main_nomination_count), 0)::int AS main_nomination_count,
            COALESCE(SUM(main_nomination_fee), 0)::DECIMAL(12,2) AS main_nomination_fee,
            COALESCE(SUM(main_nomination_extension_count), 0)::int AS main_nomination_extension_count,
            COALESCE(SUM(main_nomination_extension_fee), 0)::DECIMAL(12,2) AS main_nomination_extension_fee,
            COALESCE(SUM(inside_nomination_count), 0)::int AS inside_nomination_count,
            COALESCE(SUM(inside_nomination_fee), 0)::DECIMAL(12,2) AS inside_nomination_fee,
            COALESCE(SUM(inside_nomination_extension_count), 0)::int AS inside_nomination_extension_count,
            COALESCE(SUM(inside_nomination_extension_fee), 0)::DECIMAL(12,2) AS inside_nomination_extension_fee,
            COALESCE(SUM(together_nomination_count), 0)::int AS together_nomination_count,
            COALESCE(SUM(together_nomination_fee), 0)::DECIMAL(12,2) AS together_nomination_fee,
            COALESCE(SUM(bonus_yen), 0)::DECIMAL(12,2) AS bonus_yen,
            COALESCE(SUM(point_yen), 0)::DECIMAL(12,2) AS point_yen,
            COALESCE(SUM(additional_point_yen), 0)::DECIMAL(12,2) AS additional_point_yen,
            COALESCE(SUM(back_total), 0)::DECIMAL(12,2) AS back_total,
            COALESCE(SUM(total_pay_yen), 0)::DECIMAL(12,2) AS total_pay_yen,
            COALESCE(SUM(realTotal_price), 0)::DECIMAL(12,2) AS realTotal_price
           FROM salary_daily
           WHERE date >= $1::date AND date < $2::date
           GROUP BY user_id`,
          [rangeStart, rangeEndExclusive]
        ).catch(() => ({ rows: [] })),
        client.query(
          `SELECT user_id, key AS category_id, SUM((value)::numeric)::DECIMAL(12,2) AS sum_yen
           FROM salary_daily, jsonb_each_text(COALESCE(category_totals, '{}'::jsonb))
           WHERE date >= $1::date AND date < $2::date
           GROUP BY user_id, key`,
          [rangeStart, rangeEndExclusive]
        ).catch(() => ({ rows: [] })),
        client.query(
          `SELECT so.cast_id AS user_id, p.category_id,
             COALESCE(SUM(so.amount), 0)::INT AS sum_amount,
             COALESCE(SUM(so.castsalary_price), 0)::DECIMAL(12,2) AS sum_yen
           FROM salesorder so INNER JOIN product p ON p.id = so.product_id
           WHERE so.status = 'accepted' AND so.for_cast = 1 AND so.cast_id IS NOT NULL
             -- 業務日（朝6時 JST 起点）
             AND so.accepted_at >= ${BIZ_RANGE_START} AND so.accepted_at < ${BIZ_RANGE_END}
           GROUP BY so.cast_id, p.category_id`,
          [rangeStart, rangeEndExclusive]
        ).catch(() => ({ rows: [] })),
        client.query(
          `SELECT
             a.staff_id AS user_id,
             COALESCE(SUM(
               CASE
                 WHEN a.clock_out IS NULL THEN EXTRACT(EPOCH FROM (NOW() - a.clock_in)) / 3600.0
                 ELSE COALESCE(a.total_work_hours, EXTRACT(EPOCH FROM (a.clock_out - a.clock_in)) / 3600.0)
               END
             ), 0)::DECIMAL(10,2) AS basic_hours,
             COALESCE(SUM(
               CASE
                 WHEN a.clock_out IS NULL THEN FLOOR(GREATEST(0, EXTRACT(EPOCH FROM (NOW() - a.clock_in)) / 60.0) / 15.0) * 0.25
                 ELSE FLOOR(GREATEST(0, COALESCE(a.total_work_hours, EXTRACT(EPOCH FROM (a.clock_out - a.clock_in)) / 3600.0)) * 4.0) / 4.0
               END * COALESCE(u.hourly_price, 0)
             ), 0)::DECIMAL(12,2) AS base_pay
           FROM attendance a
           INNER JOIN "user" u ON u.id = a.staff_id
           -- 業務日（朝6時 JST 起点）
           WHERE a.clock_in >= ${BIZ_RANGE_START} AND a.clock_in < ${BIZ_RANGE_END}
           GROUP BY a.staff_id`,
          [rangeStart, rangeEndExclusive]
        ).catch(() => ({ rows: [] })),
      ]);
      const casts = castsRes.rows as any[];
      const aggByUser: Record<string, any> = {};
      for (const r of (aggRes.rows as any[])) {
        aggByUser[String(r.user_id)] = r;
      }
      const liveAttByUser: Record<string, any> = {};
      for (const r of (liveAttRes.rows as any[])) {
        liveAttByUser[String(r.user_id)] = r;
      }
      const catAmountMapRange: Record<string, Record<string, number>> = {};
      for (const r of (catAggRes.rows as any[])) {
        const uid = String(r.user_id);
        const cid = String(r.category_id);
        if (!catBackMap[uid]) catBackMap[uid] = {};
        catBackMap[uid][cid] = Number(r.sum_yen) || 0;
      }
      for (const r of (catSalesRes.rows as any[])) {
        const uid = String(r.user_id);
        const cid = String(r.category_id);
        if (!catBackMap[uid]) catBackMap[uid] = {};
        if (!catAmountMapRange[uid]) catAmountMapRange[uid] = {};
        catBackMap[uid][cid] = Number(r.sum_yen) || 0;
        catAmountMapRange[uid][cid] = Number(r.sum_amount) || 0;
      }
      result = {
        rows: casts.map((c) => {
          const uid = String(c.user_id);
          const a = aggByUser[uid];
          const liveAtt = liveAttByUser[uid];
          const categoryTotals = catBackMap[uid] || {};
          const categoryAmounts = catAmountMapRange[uid] || {};
          const categoryBackTotal = Object.values(categoryTotals).reduce((s, x) => s + (Number(x) || 0), 0);
          if (a) {
            const basePay = Number(liveAtt?.base_pay ?? a.base_pay ?? 0);
            const bonus = Number(a.bonus_yen || 0);
            const point = Number(a.point_yen || 0);
            const addPoint = Number(a.additional_point_yen || 0);
            const backTotal = Number(a.back_total || 0);
            const totalPay = basePay + backTotal + bonus + point + addPoint;
            const paid = Number(a.paid_price || 0);
            return {
              ...c,
              basic_hours: Number(liveAtt?.basic_hours ?? a.basic_hours ?? 0),
              base_pay: basePay,
              main_nomination_count: Number(a.main_nomination_count || 0),
              main_nomination_extension_count: Number(a.main_nomination_extension_count || 0),
              inside_nomination_count: Number(a.inside_nomination_count || 0),
              inside_nomination_extension_count: Number(a.inside_nomination_extension_count || 0),
              together_nomination_count: Number(a.together_nomination_count || 0),
              paid_price: paid,
              pickup_yen: Number(a.pickup_yen || 0),
              hairmake_yen: Number(a.hairmake_yen || 0),
              rental_yen: Number(a.rental_yen || 0),
              other_deduct_yen: Number(a.other_deduct_yen || 0),
              penalty_yen: Number(a.penalty_yen || 0),
              bonus_yen: bonus,
              point_yen: point,
              additional_point_yen: addPoint,
              categoryTotals,
              categoryAmounts,
              main_nomination_fee: Number(a.main_nomination_fee || 0),
              main_nomination_extension_fee: Number(a.main_nomination_extension_fee || 0),
              inside_nomination_fee: Number(a.inside_nomination_fee || 0),
              inside_nomination_extension_fee: Number(a.inside_nomination_extension_fee || 0),
              together_nomination_fee: Number(a.together_nomination_fee || 0),
              sales_back_yen: categoryBackTotal,
              back_total: backTotal,
              deduction_yen: Number(a.deduction_yen || 0),
              total_pay_yen: totalPay,
              realTotal_price: totalPay - paid,
            };
          }
          const basePay = Number(liveAtt?.base_pay || 0);
          return {
            ...c,
            basic_hours: Number(liveAtt?.basic_hours || 0),
            base_pay: basePay,
            main_nomination_count: 0,
            main_nomination_extension_count: 0,
            inside_nomination_count: 0,
            inside_nomination_extension_count: 0,
            together_nomination_count: 0,
            paid_price: 0,
            pickup_yen: 0,
            hairmake_yen: 0,
            rental_yen: 0,
            other_deduct_yen: 0,
            penalty_yen: 0,
            bonus_yen: 0,
            point_yen: 0,
            additional_point_yen: 0,
            categoryTotals: {},
            categoryAmounts: {},
            main_nomination_fee: 0,
            main_nomination_extension_fee: 0,
            inside_nomination_fee: 0,
            inside_nomination_extension_fee: 0,
            together_nomination_fee: 0,
            sales_back_yen: 0,
            back_total: 0,
            deduction_yen: 0,
            total_pay_yen: basePay,
            realTotal_price: basePay,
          };
        }),
      };
    } else {
      result = { rows: [] };
    }

    const rows = (result.rows as any[]).map((r) => {
      if (r._fromSalaryDaily || (r.total_pay_yen != null && r.back_total != null)) {
        const { _fromSalaryDaily, ...rest } = r;
        return rest;
      }
      const userId = String(r.user_id);
      const mainRate = Number(r.main_nomination || 0) / 100;
      const insideRate = Number(r.inside_nomination || 0) / 100;
      const togetherRate = Number(r.together_nomination || 0) / 100;

      const mainCnt = Number(r.main_nomination_count || 0);
      const mainExtCnt = Number(r.main_nomination_extension_count || 0);
      const insideCnt = Number(r.inside_nomination_count || 0);
      const insideExtCnt = Number(r.inside_nomination_extension_count || 0);
      const togetherCnt = Number(r.together_nomination_count || 0);

      const mainBack = (charges.main || 0) * mainRate * mainCnt;
      const mainExtBack = (charges.main || 0) * mainRate * mainExtCnt;
      const insideBack = (charges.inside || 0) * insideRate * insideCnt;
      const insideExtBack = (charges.inside || 0) * insideRate * insideExtCnt;
      const togetherBack = (charges.together || 0) * togetherRate * togetherCnt;

      const categoryTotals = catBackMap[userId] || r.categoryTotals || {};
      const categoryBackTotal = Object.values(categoryTotals).reduce((s, x) => s + (Number(x) || 0), 0);

      const bonus = Number(r.bonus_yen || 0);
      const point = Number(r.point_yen || 0);
      const addPoint = Number(r.additional_point_yen || 0);

      const back_total =
        mainBack +
        mainExtBack +
        insideBack +
        insideExtBack +
        togetherBack +
        categoryBackTotal;

      const total = Number(r.base_pay || 0) + back_total + bonus + point + addPoint;

      const paid = Number(r.paid_price || 0); // 前借日払として扱う
      const pickup = Number(r.pickup_yen || 0);
      const hairmake = Number(r.hairmake_yen || 0);
      const rental = Number(r.rental_yen || 0);
      const otherDeduct = Number(r.other_deduct_yen || 0);
      const penalty = Number(r.penalty_yen || 0);
      const deduction_yen = paid + pickup + hairmake + rental + otherDeduct + penalty;

      const unpaid = total - paid;

      return {
        ...r,
        categoryTotals,
        // back counts + amounts
        main_nomination_fee: mainBack,
        main_nomination_extension_fee: mainExtBack,
        inside_nomination_fee: insideBack,
        inside_nomination_extension_fee: insideExtBack,
        together_nomination_fee: togetherBack,
        // totals
        sales_back_yen: categoryBackTotal,
        back_total,
        deduction_yen,
        total_pay_yen: total,
        realTotal_price: unpaid,
      };
    });

    return NextResponse.json({ success: true, mode, year, month, start: rangeStart, end_exclusive: rangeEndExclusive, categories, charges, rows });
  } catch (error: any) {
    console.error('月次給与集計エラー:', error);
    const errorMessage = error?.message || '給与集計の取得に失敗しました';
    // カラムが存在しない場合のエラーメッセージ
    if (errorMessage.includes('together_nomination_cost') && errorMessage.includes('does not exist')) {
      return NextResponse.json({ 
        success: false, 
        error: 'データベースマイグレーションが必要です。migration_add_together_nomination_cost.sql を実行してください。' 
      }, { status: 500 });
    }
    if (errorMessage.includes('pickup_yen') && errorMessage.includes('does not exist')) {
      return NextResponse.json({
        success: false,
        error: 'データベースマイグレーションが必要です。salaryに控除/ボーナス列を追加してください（migration_complete.sqlを更新して適用）。',
      }, { status: 500 });
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  } finally {
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        console.error('クライアントリリースエラー:', releaseError);
      }
    }
  }
}

export async function PUT(request: NextRequest) {
  let client;
  try {
    // 接続タイムアウトを設定
    client = await Promise.race([
      pool.connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 10000)
      )
    ]) as any;
  } catch (connectError: any) {
    console.error('データベース接続エラー:', connectError);
    return NextResponse.json(
      { 
        success: false, 
        error: 'データベースに接続できませんでした。データベースサーバーが起動しているか確認してください。' 
      }, 
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const {
      user_id,
      year,
      month,
      basic_hours,
      base_pay,
      main_nomination_count,
      main_nomination_fee,
      main_nomination_extension_count,
      main_nomination_extension_fee,
      inside_nomination_count,
      inside_nomination_fee,
      inside_nomination_extension_count,
      inside_nomination_extension_fee,
      together_nomination_count,
      together_nomination_fee,
      sales_back_yen,
      pickup_yen,
      hairmake_yen,
      rental_yen,
      other_deduct_yen,
      penalty_yen,
      bonus_yen,
      point_yen,
      additional_point_yen,
      paid_price,
      deduction_yen,
      total_pay_yen,
      realTotal_price,
    } = body;
    if (!user_id || !year || !month) {
      return NextResponse.json({ success: false, error: 'user_id, year, month は必須です' }, { status: 400 });
    }

    await client.query('BEGIN');
    const paid = Number(paid_price || 0);
    const totalPay = Number(total_pay_yen ?? 0);
    const realTotal = Number(realTotal_price ?? (totalPay - paid));

    const upsert = await client.query(
      `
      INSERT INTO salary (
        user_id, year, month,
        basic_hours, base_pay,
        main_nomination_count, main_nomination_fee,
        inside_nomination_count, inside_nomination_fee,
        together_nomination_count, together_nomination_fee,
        sales_back_yen,
        pickup_yen, hairmake_yen, rental_yen, other_deduct_yen, penalty_yen,
        bonus_yen, point_yen, additional_point_yen,
        paid_price, deduction_yen,
        total_pay_yen, realTotal_price
      )
      VALUES (
        $1,$2,$3,
        $4,$5,
        $6,$7,
        $8,$9,
        $10,$11,
        $12,
        $13,$14,$15,$16,$17,
        $18,$19,$20,
        $21,$22,
        $23,$24
      )
      ON CONFLICT (user_id, year, month)
      DO UPDATE SET 
        basic_hours = EXCLUDED.basic_hours,
        base_pay = EXCLUDED.base_pay,
        main_nomination_count = EXCLUDED.main_nomination_count,
        main_nomination_fee = EXCLUDED.main_nomination_fee,
        inside_nomination_count = EXCLUDED.inside_nomination_count,
        inside_nomination_fee = EXCLUDED.inside_nomination_fee,
        together_nomination_count = EXCLUDED.together_nomination_count,
        together_nomination_fee = EXCLUDED.together_nomination_fee,
        sales_back_yen = EXCLUDED.sales_back_yen,
        pickup_yen = EXCLUDED.pickup_yen,
        hairmake_yen = EXCLUDED.hairmake_yen,
        rental_yen = EXCLUDED.rental_yen,
        other_deduct_yen = EXCLUDED.other_deduct_yen,
        penalty_yen = EXCLUDED.penalty_yen,
        bonus_yen = EXCLUDED.bonus_yen,
        point_yen = EXCLUDED.point_yen,
        additional_point_yen = EXCLUDED.additional_point_yen,
        deduction_yen = EXCLUDED.deduction_yen,
        total_pay_yen = EXCLUDED.total_pay_yen,
        paid_price = EXCLUDED.paid_price,
        realTotal_price = EXCLUDED.realTotal_price,
        updated_at = CURRENT_TIMESTAMP
      `,
      [
        user_id, year, month,
        basic_hours ?? 0,
        base_pay ?? 0,
        main_nomination_count ?? 0,
        main_nomination_fee ?? 0,
        inside_nomination_count ?? 0,
        inside_nomination_fee ?? 0,
        together_nomination_count ?? 0,
        together_nomination_fee ?? 0,
        sales_back_yen ?? 0,
        pickup_yen ?? 0,
        hairmake_yen ?? 0,
        rental_yen ?? 0,
        other_deduct_yen ?? 0,
        penalty_yen ?? 0,
        bonus_yen ?? 0,
        point_yen ?? 0,
        additional_point_yen ?? 0,
        paid,
        deduction_yen ?? 0,
        totalPay,
        realTotal,
      ]
    );
    await client.query('COMMIT');
    return NextResponse.json({ success: true });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('ロールバックエラー:', rollbackError);
      }
    }
    console.error('給与保存エラー:', error);
    return NextResponse.json({ success: false, error: '給与データの保存に失敗しました' }, { status: 500 });
  } finally {
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        console.error('クライアントリリースエラー:', releaseError);
      }
    }
  }
}


