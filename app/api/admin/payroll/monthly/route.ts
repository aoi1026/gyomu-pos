import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

function ymStart(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const year = Number(searchParams.get('year') || now.getFullYear());
    const month = Number(searchParams.get('month') || (now.getMonth() + 1));
    const source = (searchParams.get('source') || '').toLowerCase();
    if (!year || !month || month < 1 || month > 12) {
      return NextResponse.json({ success: false, error: 'Invalid year or month' }, { status: 400 });
    }
    const start = ymStart(year, month);
    const endExpr = `$1::date + INTERVAL '1 month'`;

    const result = await client.query(
      `
      WITH casts AS (
        SELECT id AS user_id, name, mail AS email, hourly_price, main_nomination, inside_nomination, bottle_back, drink_back
        FROM "user"
        WHERE role = 'cast'
      ),
      att AS (
        SELECT a.staff_id AS user_id, COALESCE(SUM(a.total_work_hours), 0) AS hours
        FROM attendance a
        WHERE a.status = 'saved'
          AND a.clock_in >= $1::date AND a.clock_in < ${endExpr}
        GROUP BY a.staff_id
      ),
      ses_main AS (
        SELECT s.cast_id AS user_id, COUNT(*) AS cnt, COALESCE(SUM(s.cost), 0) AS cost_sum
        FROM sessions s
        WHERE s.nomination_type = 'main'
          AND s.created_at >= $1::date AND s.created_at < ${endExpr}
        GROUP BY s.cast_id
      ),
      ses_inside AS (
        SELECT s.cast_id AS user_id, COUNT(*) AS cnt, COALESCE(SUM(s.cost), 0) AS cost_sum
        FROM sessions s
        WHERE s.nomination_type = 'inside'
          AND s.created_at >= $1::date AND s.created_at < ${endExpr}
        GROUP BY s.cast_id
      ),
      so_bottle AS (
        SELECT so.cast_id AS user_id, COALESCE(SUM(so.total_price), 0) AS total
        FROM salesorder so
        JOIN product p ON p.id = so.product_id
        WHERE p.category_id = 1
          AND so.accepted_at >= $1::date AND so.accepted_at < ${endExpr}
        GROUP BY so.cast_id
      ),
      so_drink AS (
        SELECT so.cast_id AS user_id, COALESCE(SUM(so.total_price), 0) AS total
        FROM salesorder so
        JOIN product p ON p.id = so.product_id
        WHERE p.category_id = 2
          AND so.accepted_at >= $1::date AND so.accepted_at < ${endExpr}
        GROUP BY so.cast_id
      ),
      sal AS (
        SELECT * FROM salary WHERE year = $2 AND month = $3
      )
      SELECT 
        c.user_id,
        c.name,
        c.email,
        COALESCE(sal.basic_hours, att.hours, 0)::DECIMAL(10,2) AS basic_hours,
        att.hours AS att_hours,
        c.hourly_price,
        (COALESCE(sal.basic_hours, att.hours, 0) * COALESCE(c.hourly_price, 0))::DECIMAL(12,2) AS base_pay,
        COALESCE(sal.main_nomination_count, sesm.cnt, 0)::INT AS main_nomination_count,
        COALESCE(sesm.cnt, 0)::INT AS sessions_main_cnt,
        (COALESCE(sesm.cost_sum, 0) * (COALESCE(c.main_nomination, 0) / 100.0))::DECIMAL(12,2) AS main_nomination_fee,
        COALESCE(sali.cnt, 0)::INT AS inside_nomination_count,
        COALESCE(sali.cnt, 0)::INT AS sessions_inside_cnt,
        (COALESCE(sali.cost_sum, 0) * (COALESCE(c.inside_nomination, 0) / 100.0))::DECIMAL(12,2) AS inside_nomination_fee,
        COALESCE(sal.bottle_back_yen, (COALESCE(sob.total, 0) * (COALESCE(c.bottle_back, 0) / 100.0)), 0)::DECIMAL(12,2) AS bottle_back_yen,
        (COALESCE(sob.total, 0) * (COALESCE(c.bottle_back, 0) / 100.0))::DECIMAL(12,2) AS bottle_back_yen_raw,
        COALESCE(sal.drink_back_yen, (COALESCE(sod.total, 0) * (COALESCE(c.drink_back, 0) / 100.0)), 0)::DECIMAL(12,2) AS drink_back_yen,
        (COALESCE(sod.total, 0) * (COALESCE(c.drink_back, 0) / 100.0))::DECIMAL(12,2) AS drink_back_yen_raw,
        COALESCE(sal.overtime_wage_yen, 0)::DECIMAL(12,2) AS overtime_wage_yen,
        COALESCE(sal.deduction_yen, 0)::DECIMAL(12,2) AS deduction_yen
      FROM casts c
      LEFT JOIN att att ON att.user_id = c.user_id
      LEFT JOIN ses_main sesm ON sesm.user_id = c.user_id
      LEFT JOIN ses_inside sali ON sali.user_id = c.user_id
      LEFT JOIN so_bottle sob ON sob.user_id = c.user_id
      LEFT JOIN so_drink sod ON sod.user_id = c.user_id
      LEFT JOIN sal sal ON sal.user_id = c.user_id
      ORDER BY c.name
      `,
      [start, year, month]
    );

    const rows = result.rows.map((r: any) => {
      if (source === 'sessions') {
        r.main_nomination_count = Number(r.sessions_main_cnt || 0);
        r.inside_nomination_count = Number(r.sessions_inside_cnt || 0);
        r.basic_hours = Number(r.att_hours || 0);
        r.base_pay = Number(r.basic_hours || 0) * Number(r.hourly_price || 0);
        r.bottle_back_yen = Number(r.bottle_back_yen_raw || 0);
        r.drink_back_yen = Number(r.drink_back_yen_raw || 0);
      }
      const total =
        Number(r.base_pay || 0) +
        Number(r.main_nomination_fee || 0) +
        Number(r.inside_nomination_fee || 0) +
        Number(r.bottle_back_yen || 0) +
        Number(r.drink_back_yen || 0) +
        Number(r.overtime_wage_yen || 0) -
        Number(r.deduction_yen || 0);
      return { ...r, total_pay_yen: total };
    });

    return NextResponse.json({ success: true, year, month, rows });
  } catch (error) {
    console.error('月次給与集計エラー:', error);
    return NextResponse.json({ success: false, error: '給与集計の取得に失敗しました' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PUT(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const { user_id, year, month, basic_hours, main_nomination_count, inside_nomination_count, bottle_back_yen, drink_back_yen, overtime_wage_yen, deduction_yen, base_pay, main_nomination_fee, inside_nomination_fee } = body;
    if (!user_id || !year || !month) {
      return NextResponse.json({ success: false, error: 'user_id, year, month は必須です' }, { status: 400 });
    }

    await client.query('BEGIN');
    const upsert = await client.query(
      `
      INSERT INTO salary (user_id, year, month, basic_hours, base_pay, main_nomination_count, main_nomination_fee, inside_nomination_count, inside_nomination_fee, bottle_back_yen, drink_back_yen, overtime_wage_yen, deduction_yen, total_pay_yen)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      ON CONFLICT (user_id, year, month)
      DO UPDATE SET 
        basic_hours = EXCLUDED.basic_hours,
        base_pay = EXCLUDED.base_pay,
        main_nomination_count = EXCLUDED.main_nomination_count,
        main_nomination_fee = EXCLUDED.main_nomination_fee,
        inside_nomination_count = EXCLUDED.inside_nomination_count,
        inside_nomination_fee = EXCLUDED.inside_nomination_fee,
        bottle_back_yen = EXCLUDED.bottle_back_yen,
        drink_back_yen = EXCLUDED.drink_back_yen,
        overtime_wage_yen = EXCLUDED.overtime_wage_yen,
        deduction_yen = EXCLUDED.deduction_yen,
        total_pay_yen = EXCLUDED.total_pay_yen,
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
        bottle_back_yen ?? 0,
        drink_back_yen ?? 0,
        overtime_wage_yen ?? 0,
        deduction_yen ?? 0,
        (Number(base_pay || 0) + Number(main_nomination_fee || 0) + Number(inside_nomination_fee || 0) + Number(bottle_back_yen || 0) + Number(drink_back_yen || 0) + Number(overtime_wage_yen || 0) - Number(deduction_yen || 0))
      ]
    );
    await client.query('COMMIT');
    return NextResponse.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('給与保存エラー:', error);
    return NextResponse.json({ success: false, error: '給与データの保存に失敗しました' }, { status: 500 });
  } finally {
    client.release();
  }
}


