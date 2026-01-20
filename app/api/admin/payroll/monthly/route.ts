import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

function ymStart(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

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

    const sql = useSalary
      ? `
      WITH casts AS (
        SELECT id AS user_id, name, mail AS email, hourly_price, main_nomination, inside_nomination, together_nomination, drink_back, food_back
        FROM "user"
        WHERE role = 'cast'
      ),
      att AS (
        SELECT a.staff_id AS user_id, COALESCE(SUM(a.total_work_hours), 0) AS hours
        FROM attendance a
         WHERE a.created_at >= $1::date AND a.created_at < $2::date
        GROUP BY a.staff_id
      ),
      nom_main AS (
        SELECT n.cast_id AS user_id,
               COUNT(*) AS cnt,
               COALESCE(SUM(n.cost_cast), 0) AS sum_fee
        FROM nomination n
        WHERE n.type_id = 'main'
          AND n.created_at >= $1::date AND n.created_at < $2::date
        GROUP BY n.cast_id
      ),
      nom_inside AS (
        SELECT n.cast_id AS user_id,
               COUNT(*) AS cnt,
               COALESCE(SUM(n.cost_cast), 0) AS sum_fee
        FROM nomination n
        WHERE n.type_id = 'inside'
          AND n.created_at >= $1::date AND n.created_at < $2::date
        GROUP BY n.cast_id
      ),
      nom_together AS (
        SELECT 
          n.cast_id AS user_id, 
          COUNT(*) AS cnt,
          COALESCE(SUM(n.cost), 0) AS sum_cost,
          COALESCE(SUM(n.cost_cast), 0) AS sum_fee
        FROM nomination n
        WHERE n.type_id = 'together'
          AND n.created_at >= $1::date AND n.created_at < $2::date
        GROUP BY n.cast_id
      ),
      ac AS (
        SELECT COALESCE(value, 0) AS together_unit
        FROM add_charges 
        WHERE charge_name = 'together'
        LIMIT 1
      ),
      sal AS (
        SELECT * FROM salary WHERE year = $3 AND month = $4
      )
      SELECT 
        c.user_id,
        c.name,
        c.email,
        COALESCE(att.hours, 0)::DECIMAL(10,2) AS basic_hours,
        c.hourly_price,
        (COALESCE(att.hours, 0) * COALESCE(c.hourly_price, 0))::DECIMAL(12,2) AS base_pay,
        COALESCE(nm.cnt, 0)::INT AS main_nomination_count,
        COALESCE(nm.sum_fee, 0)::DECIMAL(12,2) AS main_nomination_fee,
        COALESCE(ni.cnt, 0)::INT AS inside_nomination_count,
        COALESCE(ni.sum_fee, 0)::DECIMAL(12,2) AS inside_nomination_fee,
        COALESCE(sal.together_nomination_cost, COALESCE(nt.sum_cost, 0))::DECIMAL(12,2) AS together_nomination_cost,
        COALESCE(nt.cnt, 0)::INT AS together_nomination_count,
        COALESCE(nt.sum_fee, 0)::DECIMAL(12,2) AS together_nomination_fee,
        COALESCE(sal.sales_back_yen, 0)::DECIMAL(12,2) AS sales_back_yen,
        COALESCE(sal.overtime_wage_yen, 0)::DECIMAL(12,2) AS overtime_wage_yen,
        COALESCE(sal.deduction_yen, 0)::DECIMAL(12,2) AS deduction_yen,
        COALESCE(sal.paid_price, 0)::DECIMAL(12,2) AS paid_price,
        COALESCE(sal.realTotal_price, 0)::DECIMAL(12,2) AS realTotal_price
      FROM casts c
      LEFT JOIN att att ON att.user_id = c.user_id
      LEFT JOIN nom_main nm ON nm.user_id = c.user_id
      LEFT JOIN nom_inside ni ON ni.user_id = c.user_id
      LEFT JOIN nom_together nt ON nt.user_id = c.user_id
      LEFT JOIN sal sal ON sal.user_id = c.user_id
      LEFT JOIN ac ac ON TRUE
      ORDER BY c.name
      `
      : `
      WITH casts AS (
        SELECT id AS user_id, name, mail AS email, hourly_price, main_nomination, inside_nomination, together_nomination, drink_back, food_back
        FROM "user"
        WHERE role = 'cast'
      ),
      att AS (
        SELECT a.staff_id AS user_id, COALESCE(SUM(a.total_work_hours), 0) AS hours
        FROM attendance a
        WHERE a.created_at >= $1::date AND a.created_at < $2::date
        GROUP BY a.staff_id
      ),
      nom_main AS (
        SELECT n.cast_id AS user_id,
               COUNT(*) AS cnt,
               COALESCE(SUM(n.cost_cast), 0) AS sum_fee
        FROM nomination n
        WHERE n.type_id = 'main'
          AND n.created_at >= $1::date AND n.created_at < $2::date
        GROUP BY n.cast_id
      ),
      nom_inside AS (
        SELECT n.cast_id AS user_id,
               COUNT(*) AS cnt,
               COALESCE(SUM(n.cost_cast), 0) AS sum_fee
        FROM nomination n
        WHERE n.type_id = 'inside'
          AND n.created_at >= $1::date AND n.created_at < $2::date
        GROUP BY n.cast_id
      ),
      nom_together AS (
        SELECT 
          n.cast_id AS user_id, 
          COUNT(*) AS cnt,
          COALESCE(SUM(n.cost), 0) AS sum_cost,
          COALESCE(SUM(n.cost_cast), 0) AS sum_fee
        FROM nomination n
        WHERE n.type_id = 'together'
          AND n.created_at >= $1::date AND n.created_at < $2::date
        GROUP BY n.cast_id
      ),
      ac AS (
        SELECT COALESCE(value, 0) AS together_unit
        FROM add_charges 
        WHERE charge_name = 'together'
        LIMIT 1
      )
      SELECT 
        c.user_id,
        c.name,
        c.email,
        COALESCE(att.hours, 0)::DECIMAL(10,2) AS basic_hours,
        c.hourly_price,
        (COALESCE(att.hours, 0) * COALESCE(c.hourly_price, 0))::DECIMAL(12,2) AS base_pay,
        COALESCE(nm.cnt, 0)::INT AS main_nomination_count,
        COALESCE(nm.sum_fee, 0)::DECIMAL(12,2) AS main_nomination_fee,
        COALESCE(ni.cnt, 0)::INT AS inside_nomination_count,
        COALESCE(ni.sum_fee, 0)::DECIMAL(12,2) AS inside_nomination_fee,
        COALESCE(nt.sum_cost, 0)::DECIMAL(12,2) AS together_nomination_cost,
        COALESCE(nt.cnt, 0)::INT AS together_nomination_count,
        COALESCE(nt.sum_fee, 0)::DECIMAL(12,2) AS together_nomination_fee,
        0::DECIMAL(12,2) AS sales_back_yen,
        0::DECIMAL(12,2) AS overtime_wage_yen,
        0::DECIMAL(12,2) AS deduction_yen,
        0::DECIMAL(12,2) AS paid_price,
        0::DECIMAL(12,2) AS realTotal_price
      FROM casts c
      LEFT JOIN att att ON att.user_id = c.user_id
      LEFT JOIN nom_main nm ON nm.user_id = c.user_id
      LEFT JOIN nom_inside ni ON ni.user_id = c.user_id
      LEFT JOIN nom_together nt ON nt.user_id = c.user_id
      LEFT JOIN ac ac ON TRUE
      ORDER BY c.name
      `;

    const params = useSalary
      ? [rangeStart, rangeEndExclusive, year, month]
      : [rangeStart, rangeEndExclusive];

    const result = await client.query(sql, params);

    const rows = result.rows.map((r: any) => {
      const paid = Number(r.paid_price || 0);
      const total =
        Number(r.base_pay || 0) +
        Number(r.main_nomination_fee || 0) +
        Number(r.inside_nomination_fee || 0) +
        Number(r.together_nomination_fee || 0) +
        Number(r.sales_back_yen || 0) +
        Number(r.overtime_wage_yen || 0) -
        Number(r.deduction_yen || 0);
      const realTotal = total - paid;
      return { ...r, total_pay_yen: total, paid_price: paid, realTotal_price: realTotal };
    });

    return NextResponse.json({ success: true, mode, year, month, start: rangeStart, end_exclusive: rangeEndExclusive, rows });
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
    const { user_id, year, month, basic_hours, main_nomination_count, inside_nomination_count, together_nomination_cost, together_nomination_count, sales_back_yen, overtime_wage_yen, deduction_yen, base_pay, main_nomination_fee, inside_nomination_fee, together_nomination_fee, paid_price } = body;
    if (!user_id || !year || !month) {
      return NextResponse.json({ success: false, error: 'user_id, year, month は必須です' }, { status: 400 });
    }

    await client.query('BEGIN');
    const totalPay =
      (Number(base_pay || 0) +
        Number(main_nomination_fee || 0) +
        Number(inside_nomination_fee || 0) +
        Number(together_nomination_fee || 0) +
        Number(sales_back_yen || 0) +
        Number(overtime_wage_yen || 0) -
        Number(deduction_yen || 0));
    const paid = Number(paid_price || 0);
    const realTotal = totalPay - paid;

    const upsert = await client.query(
      `
      INSERT INTO salary (user_id, year, month, basic_hours, base_pay, main_nomination_count, main_nomination_fee, inside_nomination_count, inside_nomination_fee, together_nomination_cost, together_nomination_count, together_nomination_fee, sales_back_yen, overtime_wage_yen, deduction_yen, total_pay_yen, paid_price, realTotal_price)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      ON CONFLICT (user_id, year, month)
      DO UPDATE SET 
        basic_hours = EXCLUDED.basic_hours,
        base_pay = EXCLUDED.base_pay,
        main_nomination_count = EXCLUDED.main_nomination_count,
        main_nomination_fee = EXCLUDED.main_nomination_fee,
        inside_nomination_count = EXCLUDED.inside_nomination_count,
        inside_nomination_fee = EXCLUDED.inside_nomination_fee,
        together_nomination_cost = EXCLUDED.together_nomination_cost,
        together_nomination_count = EXCLUDED.together_nomination_count,
        together_nomination_fee = EXCLUDED.together_nomination_fee,
        sales_back_yen = EXCLUDED.sales_back_yen,
        overtime_wage_yen = EXCLUDED.overtime_wage_yen,
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
        together_nomination_cost ?? 0,
        together_nomination_count ?? 0,
        together_nomination_fee ?? 0,
        sales_back_yen ?? 0,
        overtime_wage_yen ?? 0,
        deduction_yen ?? 0,
        totalPay,
        paid,
        realTotal
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


