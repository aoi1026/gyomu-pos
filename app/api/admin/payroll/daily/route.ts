import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

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
    client = await Promise.race([
      pool.connect(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), 10000)
      )
    ]) as any;
  } catch (connectError: any) {
    console.error('データベース接続エラー:', connectError);
    return NextResponse.json(
      { success: false, error: 'データベースに接続できませんでした。' },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');

    if (!userId || !startParam || !endParam) {
      return NextResponse.json({ success: false, error: 'user_id, start, end は必須です' }, { status: 400 });
    }

    const next = addDays(endParam, 1);
    if (!next) {
      return NextResponse.json({ success: false, error: 'Invalid end date' }, { status: 400 });
    }
    const rangeEndExclusive = next;

    // カテゴリ・単価・ユーザー率
    const [categoriesRes, chargesRes, userRes] = await Promise.all([
      client.query(`SELECT id, name FROM category ORDER BY id`),
      client.query(
        `SELECT charge_name, COALESCE(value, 0) AS value FROM add_charges WHERE charge_name IN ('main','inside','together')`
      ),
      client.query(
        `SELECT id AS user_id, hourly_price, main_nomination, inside_nomination, together_nomination FROM "user" WHERE id = $1 AND role = 'cast'`,
        [userId]
      ),
    ]);
    const categories = categoriesRes.rows as Array<{ id: number; name: string }>;
    const charges: Record<string, number> = {};
    for (const r of chargesRes.rows) charges[String(r.charge_name)] = Number(r.value) || 0;
    const user = (userRes.rows[0] as any) || {};
    const mainRate = Number(user.main_nomination || 0) / 100;
    const insideRate = Number(user.inside_nomination || 0) / 100;
    const togetherRate = Number(user.together_nomination || 0) / 100;

    const sql = `
      WITH date_series AS (
        SELECT generate_series($1::date, ($2::date - interval '1 day')::date, interval '1 day')::date AS date
      ),
      ext_events AS (
        SELECT
          s.id AS session_id,
          (e->>'timestamp')::bigint AS ts_ms,
          (to_timestamp(((e->>'timestamp')::numeric)/1000))::date AS ext_date
        FROM sessions s
        CROSS JOIN LATERAL jsonb_array_elements(COALESCE(s.set_extensions, '[]'::jsonb)) e
        WHERE (e->>'timestamp') IS NOT NULL
          AND (to_timestamp(((e->>'timestamp')::numeric)/1000))::date >= $1::date
          AND (to_timestamp(((e->>'timestamp')::numeric)/1000))::date < $2::date
      ),
      main_ext_by_date AS (
        SELECT ee.ext_date AS date, COUNT(DISTINCT (ee.session_id, ee.ts_ms))::int AS cnt
        FROM ext_events ee
        WHERE EXISTS (
          SELECT 1 FROM nomination n
          WHERE n.session_id = ee.session_id AND n.cast_id = $3::int AND n.type_id IN ('main','together')
            AND (ee.ts_ms / 1000.0) > EXTRACT(EPOCH FROM n.created_at)
        )
        GROUP BY ee.ext_date
      ),
      inside_ext_by_date AS (
        SELECT ee.ext_date AS date, COUNT(DISTINCT (ee.session_id, ee.ts_ms))::int AS cnt
        FROM ext_events ee
        WHERE EXISTS (
          SELECT 1 FROM nomination n
          WHERE n.session_id = ee.session_id AND n.cast_id = $3::int AND n.type_id = 'inside'
            AND (ee.ts_ms / 1000.0) > EXTRACT(EPOCH FROM n.created_at)
        )
        GROUP BY ee.ext_date
      ),
      att AS (
        SELECT DATE(a.created_at) AS date, COALESCE(SUM(a.total_work_hours), 0) AS hours
        FROM attendance a
        WHERE a.staff_id = $3::int
          AND DATE(a.created_at) >= $1::date AND DATE(a.created_at) < $2::date
        GROUP BY DATE(a.created_at)
      ),
      nom_main AS (
        SELECT DATE(n.created_at) AS date, COUNT(*)::int AS cnt, COALESCE(SUM(n.cost_cast), 0) AS sum_fee
        FROM nomination n
        WHERE n.cast_id = $3::int AND n.type_id = 'main'
          AND DATE(n.created_at) >= $1::date AND DATE(n.created_at) < $2::date
        GROUP BY DATE(n.created_at)
      ),
      nom_inside AS (
        SELECT DATE(n.created_at) AS date, COUNT(*)::int AS cnt, COALESCE(SUM(n.cost_cast), 0) AS sum_fee
        FROM nomination n
        WHERE n.cast_id = $3::int AND n.type_id = 'inside'
          AND DATE(n.created_at) >= $1::date AND DATE(n.created_at) < $2::date
        GROUP BY DATE(n.created_at)
      ),
      nom_together AS (
        SELECT DATE(n.created_at) AS date, COUNT(*)::int AS cnt, COALESCE(SUM(n.cost_cast), 0) AS sum_fee
        FROM nomination n
        WHERE n.cast_id = $3::int AND n.type_id = 'together'
          AND DATE(n.created_at) >= $1::date AND DATE(n.created_at) < $2::date
        GROUP BY DATE(n.created_at)
      ),
      cast_info AS (
        SELECT id AS user_id, hourly_price
        FROM "user"
        WHERE id = $3::int AND role = 'cast'
      )
      SELECT
        ds.date,
        ci.user_id,
        ci.hourly_price,
        COALESCE(att.hours, 0)::DECIMAL(10,2) AS basic_hours,
        (COALESCE(att.hours, 0) * COALESCE(ci.hourly_price, 0))::DECIMAL(12,2) AS base_pay,
        COALESCE(nm.cnt, 0)::INT AS main_nomination_count,
        COALESCE(me.cnt, 0)::INT AS main_nomination_extension_count,
        COALESCE(ni.cnt, 0)::INT AS inside_nomination_count,
        COALESCE(ie.cnt, 0)::INT AS inside_nomination_extension_count,
        COALESCE(nt.cnt, 0)::INT AS together_nomination_count
      FROM date_series ds
      CROSS JOIN cast_info ci
      LEFT JOIN att att ON att.date = ds.date
      LEFT JOIN nom_main nm ON nm.date = ds.date
      LEFT JOIN main_ext_by_date me ON me.date = ds.date
      LEFT JOIN nom_inside ni ON ni.date = ds.date
      LEFT JOIN inside_ext_by_date ie ON ie.date = ds.date
      LEFT JOIN nom_together nt ON nt.date = ds.date
      ORDER BY ds.date
    `;

    const result = await client.query(sql, [startParam, rangeEndExclusive, userId]);

    // 日別カテゴリ別 amount 合計・castsalary_price 合計（検索日付条件に合致する salesorder）
    const catBackRes = await client.query(
      `
      SELECT DATE(so.accepted_at) AS date, p.category_id,
        COALESCE(SUM(so.amount), 0)::INT AS sum_amount,
        COALESCE(SUM(so.castsalary_price), 0)::DECIMAL(12,2) AS sum_yen
      FROM salesorder so
      INNER JOIN product p ON p.id = so.product_id
      WHERE so.cast_id = $3::int
        AND so.status = 'accepted'
        AND so.for_cast = 1
        AND DATE(so.accepted_at) >= $1::date
        AND DATE(so.accepted_at) < $2::date
      GROUP BY DATE(so.accepted_at), p.category_id
      `,
      [startParam, rangeEndExclusive, userId]
    );
    const catBackMap: Record<string, Record<string, number>> = {};
    const catAmountMap: Record<string, Record<string, number>> = {};
    for (const r of catBackRes.rows as any[]) {
      const d = r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date).slice(0, 10);
      const cid = String(r.category_id);
      if (!catBackMap[d]) catBackMap[d] = {};
      if (!catAmountMap[d]) catAmountMap[d] = {};
      catBackMap[d][cid] = Number(r.sum_yen) || 0;
      catAmountMap[d][cid] = Number(r.sum_amount) || 0;
    }

    // salary_daily に保存済みの行を取得（同一ユーザー・日付範囲）
    let savedDailyMap: Record<string, any> = {};
    try {
      const savedRes = await client.query(
        `SELECT * FROM salary_daily WHERE user_id = $1 AND date >= $2::date AND date < $3::date`,
        [userId, startParam, rangeEndExclusive]
      );
      for (const row of savedRes.rows as any[]) {
        const d = row.date instanceof Date ? row.date.toISOString().split('T')[0] : String(row.date).slice(0, 10);
        savedDailyMap[d] = row;
      }
    } catch (_) {
      // テーブル未作成時は無視
    }

    const rows = (result.rows as any[]).map((r) => {
      const dateStr = r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date).slice(0, 10);
      const saved = savedDailyMap[dateStr];

      if (saved) {
        const categoryTotals = saved.category_totals && typeof saved.category_totals === 'object'
          ? saved.category_totals
          : {};
        const categoryAmounts = catAmountMap[dateStr] || {};
        return {
          date: dateStr,
          user_id: saved.user_id,
          hourly_price: Number(saved.hourly_price || 0),
          basic_hours: Number(saved.basic_hours || 0),
          base_pay: Number(saved.base_pay || 0),
          main_nomination_count: Number(saved.main_nomination_count || 0),
          main_nomination_extension_count: Number(saved.main_nomination_extension_count || 0),
          inside_nomination_count: Number(saved.inside_nomination_count || 0),
          inside_nomination_extension_count: Number(saved.inside_nomination_extension_count || 0),
          together_nomination_count: Number(saved.together_nomination_count || 0),
          categoryTotals,
          categoryAmounts,
          main_nomination_fee: Number(saved.main_nomination_fee || 0),
          main_nomination_extension_fee: Number(saved.main_nomination_extension_fee || 0),
          inside_nomination_fee: Number(saved.inside_nomination_fee || 0),
          inside_nomination_extension_fee: Number(saved.inside_nomination_extension_fee || 0),
          together_nomination_fee: Number(saved.together_nomination_fee || 0),
          sales_back_yen: Object.values(categoryTotals).reduce((s: number, x: any) => s + (Number(x) || 0), 0),
          paid_price: Number(saved.paid_price || 0),
          pickup_yen: Number(saved.pickup_yen || 0),
          hairmake_yen: Number(saved.hairmake_yen || 0),
          rental_yen: Number(saved.rental_yen || 0),
          other_deduct_yen: Number(saved.other_deduct_yen || 0),
          penalty_yen: Number(saved.penalty_yen || 0),
          deduction_yen: Number(saved.deduction_yen || 0),
          bonus_yen: Number(saved.bonus_yen || 0),
          point_yen: Number(saved.point_yen || 0),
          additional_point_yen: Number(saved.additional_point_yen || 0),
          back_total: Number(saved.back_total || 0),
          total_pay_yen: Number(saved.total_pay_yen || 0),
          realTotal_price: Number(saved.realTotal_price || 0),
        };
      }

      const categoryTotals = catBackMap[dateStr] || {};
      const categoryAmounts = catAmountMap[dateStr] || {};
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

      const categoryBackTotal = Object.values(categoryTotals).reduce((s, x) => s + (Number(x) || 0), 0);
      const bonus = 0;
      const point = 0;
      const addPoint = 0;
      const back_total =
        mainBack + mainExtBack + insideBack + insideExtBack + togetherBack + categoryBackTotal;

      const base_pay = Number(r.base_pay || 0);
      const total = base_pay + back_total + bonus + point + addPoint;

      const paid = 0;
      const pickup = 0;
      const hairmake = 0;
      const rental = 0;
      const otherDeduct = 0;
      const penalty = 0;
      const deduction_yen = paid + pickup + hairmake + rental + otherDeduct + penalty;
      const unpaid = total - paid;

      return {
        ...r,
        date: dateStr,
        categoryTotals,
        categoryAmounts,
        main_nomination_fee: mainBack,
        main_nomination_extension_fee: mainExtBack,
        inside_nomination_fee: insideBack,
        inside_nomination_extension_fee: insideExtBack,
        together_nomination_fee: togetherBack,
        sales_back_yen: categoryBackTotal,
        back_total,
        paid_price: paid,
        pickup_yen: pickup,
        hairmake_yen: hairmake,
        rental_yen: rental,
        other_deduct_yen: otherDeduct,
        penalty_yen: penalty,
        deduction_yen,
        bonus_yen: bonus,
        point_yen: point,
        additional_point_yen: addPoint,
        total_pay_yen: total,
        realTotal_price: unpaid,
      };
    });

    return NextResponse.json({ success: true, categories, rows });
  } catch (error: any) {
    console.error('日別給与集計エラー:', error);
    return NextResponse.json({ success: false, error: error?.message || '日別給与集計の取得に失敗しました' }, { status: 500 });
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
    client = await Promise.race([
      pool.connect(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), 10000)
      )
    ]) as any;
  } catch (connectError: any) {
    console.error('データベース接続エラー:', connectError);
    return NextResponse.json(
      { success: false, error: 'データベースに接続できませんでした。' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const dateParam = body.date;
    const userId = body.user_id != null ? String(body.user_id) : null;

    if (!dateParam || !userId) {
      return NextResponse.json({ success: false, error: 'date と user_id は必須です' }, { status: 400 });
    }
    const rangeEndExclusive = addDays(dateParam, 1);
    if (!rangeEndExclusive) {
      return NextResponse.json({ success: false, error: 'Invalid date' }, { status: 400 });
    }

    const editable = {
      basic_hours: body.basic_hours != null ? Number(body.basic_hours) : undefined,
      paid_price: body.paid_price != null ? Number(body.paid_price) : undefined,
      pickup_yen: body.pickup_yen != null ? Number(body.pickup_yen) : undefined,
      hairmake_yen: body.hairmake_yen != null ? Number(body.hairmake_yen) : undefined,
      rental_yen: body.rental_yen != null ? Number(body.rental_yen) : undefined,
      other_deduct_yen: body.other_deduct_yen != null ? Number(body.other_deduct_yen) : undefined,
      penalty_yen: body.penalty_yen != null ? Number(body.penalty_yen) : undefined,
      bonus_yen: body.bonus_yen != null ? Number(body.bonus_yen) : undefined,
      point_yen: body.point_yen != null ? Number(body.point_yen) : undefined,
      additional_point_yen: body.additional_point_yen != null ? Number(body.additional_point_yen) : undefined,
    };

    const [categoriesRes, chargesRes, userRes, existingRow] = await Promise.all([
      client.query(`SELECT id, name FROM category ORDER BY id`),
      client.query(
        `SELECT charge_name, COALESCE(value, 0) AS value FROM add_charges WHERE charge_name IN ('main','inside','together')`
      ),
      client.query(
        `SELECT id AS user_id, hourly_price, main_nomination, inside_nomination, together_nomination FROM "user" WHERE id = $1 AND role = 'cast'`,
        [userId]
      ),
      client.query(
        `SELECT * FROM salary_daily WHERE user_id = $1 AND date = $2::date`,
        [userId, dateParam]
      ).catch(() => ({ rows: [] })),
    ]);

    const categories = categoriesRes.rows as Array<{ id: number; name: string }>;
    const charges: Record<string, number> = {};
    for (const r of chargesRes.rows) charges[String(r.charge_name)] = Number(r.value) || 0;
    const user = (userRes.rows[0] as any) || {};
    const mainRate = Number(user.main_nomination || 0) / 100;
    const insideRate = Number(user.inside_nomination || 0) / 100;
    const togetherRate = Number(user.together_nomination || 0) / 100;
    const hourly_price = user.hourly_price != null ? Number(user.hourly_price) : 0;
    const saved = (existingRow as any).rows[0] as any;

    const sql = `
      WITH date_series AS (
        SELECT $1::date AS date
      ),
      ext_events AS (
        SELECT
          s.id AS session_id,
          (e->>'timestamp')::bigint AS ts_ms,
          (to_timestamp(((e->>'timestamp')::numeric)/1000))::date AS ext_date
        FROM sessions s
        CROSS JOIN LATERAL jsonb_array_elements(COALESCE(s.set_extensions, '[]'::jsonb)) e
        WHERE (e->>'timestamp') IS NOT NULL
          AND (to_timestamp(((e->>'timestamp')::numeric)/1000))::date >= $1::date
          AND (to_timestamp(((e->>'timestamp')::numeric)/1000))::date < $2::date
      ),
      main_ext_by_date AS (
        SELECT ee.ext_date AS date, COUNT(DISTINCT (ee.session_id, ee.ts_ms))::int AS cnt
        FROM ext_events ee
        WHERE EXISTS (
          SELECT 1 FROM nomination n
          WHERE n.session_id = ee.session_id AND n.cast_id = $3::int AND n.type_id IN ('main','together')
            AND (ee.ts_ms / 1000.0) > EXTRACT(EPOCH FROM n.created_at)
        )
        GROUP BY ee.ext_date
      ),
      inside_ext_by_date AS (
        SELECT ee.ext_date AS date, COUNT(DISTINCT (ee.session_id, ee.ts_ms))::int AS cnt
        FROM ext_events ee
        WHERE EXISTS (
          SELECT 1 FROM nomination n
          WHERE n.session_id = ee.session_id AND n.cast_id = $3::int AND n.type_id = 'inside'
            AND (ee.ts_ms / 1000.0) > EXTRACT(EPOCH FROM n.created_at)
        )
        GROUP BY ee.ext_date
      ),
      att AS (
        SELECT DATE(a.created_at) AS date, COALESCE(SUM(a.total_work_hours), 0) AS hours
        FROM attendance a
        WHERE a.staff_id = $3::int
          AND DATE(a.created_at) >= $1::date AND DATE(a.created_at) < $2::date
        GROUP BY DATE(a.created_at)
      ),
      nom_main AS (
        SELECT DATE(n.created_at) AS date, COUNT(*)::int AS cnt
        FROM nomination n
        WHERE n.cast_id = $3::int AND n.type_id = 'main'
          AND DATE(n.created_at) >= $1::date AND DATE(n.created_at) < $2::date
        GROUP BY DATE(n.created_at)
      ),
      nom_inside AS (
        SELECT DATE(n.created_at) AS date, COUNT(*)::int AS cnt
        FROM nomination n
        WHERE n.cast_id = $3::int AND n.type_id = 'inside'
          AND DATE(n.created_at) >= $1::date AND DATE(n.created_at) < $2::date
        GROUP BY DATE(n.created_at)
      ),
      nom_together AS (
        SELECT DATE(n.created_at) AS date, COUNT(*)::int AS cnt
        FROM nomination n
        WHERE n.cast_id = $3::int AND n.type_id = 'together'
          AND DATE(n.created_at) >= $1::date AND DATE(n.created_at) < $2::date
        GROUP BY DATE(n.created_at)
      ),
      cast_info AS (
        SELECT id AS user_id, hourly_price
        FROM "user"
        WHERE id = $3::int AND role = 'cast'
      )
      SELECT
        ds.date,
        COALESCE(att.hours, 0)::DECIMAL(10,2) AS basic_hours,
        COALESCE(nm.cnt, 0)::INT AS main_nomination_count,
        COALESCE(me.cnt, 0)::INT AS main_nomination_extension_count,
        COALESCE(ni.cnt, 0)::INT AS inside_nomination_count,
        COALESCE(ie.cnt, 0)::INT AS inside_nomination_extension_count,
        COALESCE(nt.cnt, 0)::INT AS together_nomination_count
      FROM date_series ds
      CROSS JOIN cast_info ci
      LEFT JOIN att att ON att.date = ds.date
      LEFT JOIN nom_main nm ON nm.date = ds.date
      LEFT JOIN main_ext_by_date me ON me.date = ds.date
      LEFT JOIN nom_inside ni ON ni.date = ds.date
      LEFT JOIN inside_ext_by_date ie ON ie.date = ds.date
      LEFT JOIN nom_together nt ON nt.date = ds.date
    `;
    const oneResult = await client.query(sql, [dateParam, rangeEndExclusive, userId]);
    const row = (oneResult.rows[0] as any) || {};

    let basic_hours = editable.basic_hours ?? (saved ? Number(saved.basic_hours) : undefined) ?? Number(row.basic_hours || 0);
    const paid_price = editable.paid_price ?? (saved ? Number(saved.paid_price) : undefined) ?? 0;
    const pickup_yen = editable.pickup_yen ?? (saved ? Number(saved.pickup_yen) : undefined) ?? 0;
    const hairmake_yen = editable.hairmake_yen ?? (saved ? Number(saved.hairmake_yen) : undefined) ?? 0;
    const rental_yen = editable.rental_yen ?? (saved ? Number(saved.rental_yen) : undefined) ?? 0;
    const other_deduct_yen = editable.other_deduct_yen ?? (saved ? Number(saved.other_deduct_yen) : undefined) ?? 0;
    const penalty_yen = editable.penalty_yen ?? (saved ? Number(saved.penalty_yen) : undefined) ?? 0;
    const bonus_yen = editable.bonus_yen ?? (saved ? Number(saved.bonus_yen) : undefined) ?? 0;
    const point_yen = editable.point_yen ?? (saved ? Number(saved.point_yen) : undefined) ?? 0;
    const additional_point_yen = editable.additional_point_yen ?? (saved ? Number(saved.additional_point_yen) : undefined) ?? 0;

    const hourly = saved ? Number(saved.hourly_price) : hourly_price;
    const base_pay = basic_hours * (hourly || 0);

    const mainCnt = Number(row.main_nomination_count || 0);
    const mainExtCnt = Number(row.main_nomination_extension_count || 0);
    const insideCnt = Number(row.inside_nomination_count || 0);
    const insideExtCnt = Number(row.inside_nomination_extension_count || 0);
    const togetherCnt = Number(row.together_nomination_count || 0);
    const mainBack = (charges.main || 0) * mainRate * mainCnt;
    const mainExtBack = (charges.main || 0) * mainRate * mainExtCnt;
    const insideBack = (charges.inside || 0) * insideRate * insideCnt;
    const insideExtBack = (charges.inside || 0) * insideRate * insideExtCnt;
    const togetherBack = (charges.together || 0) * togetherRate * togetherCnt;

    const catBackRes = await client.query(
      `SELECT p.category_id, COALESCE(SUM(so.castsalary_price), 0)::DECIMAL(12,2) AS sum_yen
       FROM salesorder so
       INNER JOIN product p ON p.id = so.product_id
       WHERE so.cast_id = $1::int AND so.status = 'accepted' AND so.for_cast = 1
         AND DATE(so.accepted_at) >= $2::date AND DATE(so.accepted_at) < $3::date
       GROUP BY p.category_id`,
      [userId, dateParam, rangeEndExclusive]
    );
    const category_totals: Record<string, number> = {};
    for (const r of catBackRes.rows as any[]) {
      category_totals[String(r.category_id)] = Number(r.sum_yen) || 0;
    }
    const categoryBackTotal = Object.values(category_totals).reduce((s, x) => s + x, 0);

    const deduction_yen = paid_price + pickup_yen + hairmake_yen + rental_yen + other_deduct_yen + penalty_yen;
    const back_total =
      mainBack + mainExtBack + insideBack + insideExtBack + togetherBack + categoryBackTotal;
    const total_pay_yen = base_pay + back_total + bonus_yen + point_yen + additional_point_yen;
    const realTotal_price = total_pay_yen - deduction_yen;

    await client.query(
      `INSERT INTO salary_daily (
        date, user_id, basic_hours, paid_price, pickup_yen, hairmake_yen, rental_yen, other_deduct_yen, penalty_yen,
        deduction_yen, hourly_price, base_pay,
        main_nomination_count, main_nomination_fee, main_nomination_extension_count, main_nomination_extension_fee,
        inside_nomination_count, inside_nomination_fee, inside_nomination_extension_count, inside_nomination_extension_fee,
        together_nomination_count, together_nomination_fee, category_totals,
        bonus_yen, point_yen, additional_point_yen, back_total, total_pay_yen, realTotal_price
      ) VALUES (
        $1::date, $2::int, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23::jsonb,
        $24, $25, $26, $27, $28, $29
      )
      ON CONFLICT (date, user_id) DO UPDATE SET
        basic_hours = EXCLUDED.basic_hours,
        paid_price = EXCLUDED.paid_price,
        pickup_yen = EXCLUDED.pickup_yen,
        hairmake_yen = EXCLUDED.hairmake_yen,
        rental_yen = EXCLUDED.rental_yen,
        other_deduct_yen = EXCLUDED.other_deduct_yen,
        penalty_yen = EXCLUDED.penalty_yen,
        deduction_yen = EXCLUDED.deduction_yen,
        hourly_price = EXCLUDED.hourly_price,
        base_pay = EXCLUDED.base_pay,
        main_nomination_count = EXCLUDED.main_nomination_count,
        main_nomination_fee = EXCLUDED.main_nomination_fee,
        main_nomination_extension_count = EXCLUDED.main_nomination_extension_count,
        main_nomination_extension_fee = EXCLUDED.main_nomination_extension_fee,
        inside_nomination_count = EXCLUDED.inside_nomination_count,
        inside_nomination_fee = EXCLUDED.inside_nomination_fee,
        inside_nomination_extension_count = EXCLUDED.inside_nomination_extension_count,
        inside_nomination_extension_fee = EXCLUDED.inside_nomination_extension_fee,
        together_nomination_count = EXCLUDED.together_nomination_count,
        together_nomination_fee = EXCLUDED.together_nomination_fee,
        category_totals = EXCLUDED.category_totals,
        bonus_yen = EXCLUDED.bonus_yen,
        point_yen = EXCLUDED.point_yen,
        additional_point_yen = EXCLUDED.additional_point_yen,
        back_total = EXCLUDED.back_total,
        total_pay_yen = EXCLUDED.total_pay_yen,
        realTotal_price = EXCLUDED.realTotal_price`,
      [
        dateParam, userId, basic_hours, paid_price, pickup_yen, hairmake_yen, rental_yen, other_deduct_yen, penalty_yen,
        deduction_yen, hourly, base_pay,
        mainCnt, mainBack, mainExtCnt, mainExtBack, insideCnt, insideBack, insideExtCnt, insideExtBack, togetherCnt, togetherBack, JSON.stringify(category_totals),
        bonus_yen, point_yen, additional_point_yen, back_total, total_pay_yen, realTotal_price,
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('salary_daily 保存エラー:', error);
    return NextResponse.json({ success: false, error: error?.message || '保存に失敗しました' }, { status: 500 });
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
