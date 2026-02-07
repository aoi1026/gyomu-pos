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
      { 
        success: false, 
        error: 'データベースに接続できませんでした。' 
      }, 
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

    // endParamをexclusiveに変換（SQLクエリで使用）
    const next = addDays(endParam, 1);
    if (!next) {
      return NextResponse.json({ success: false, error: 'Invalid end date' }, { status: 400 });
    }
    const rangeEndExclusive = next;

    const sql = `
      WITH date_series AS (
        SELECT generate_series($1::date, ($2::date - interval '1 day')::date, interval '1 day')::date AS date
      ),
      att AS (
        SELECT 
          a.staff_id AS user_id,
          DATE(a.created_at) AS date,
          COALESCE(SUM(a.total_work_hours), 0) AS hours
        FROM attendance a
        WHERE a.staff_id = $3::int
          AND DATE(a.created_at) >= $1::date 
          AND DATE(a.created_at) < $2::date
        GROUP BY a.staff_id, DATE(a.created_at)
      ),
      nom_main AS (
        SELECT 
          n.cast_id AS user_id,
          DATE(n.created_at) AS date,
          COUNT(*) AS cnt,
          COALESCE(SUM(n.cost_cast), 0) AS sum_fee
        FROM nomination n
        WHERE n.cast_id = $3::int
          AND n.type_id = 'main'
          AND DATE(n.created_at) >= $1::date 
          AND DATE(n.created_at) < $2::date
        GROUP BY n.cast_id, DATE(n.created_at)
      ),
      nom_inside AS (
        SELECT 
          n.cast_id AS user_id,
          DATE(n.created_at) AS date,
          COUNT(*) AS cnt,
          COALESCE(SUM(n.cost_cast), 0) AS sum_fee
        FROM nomination n
        WHERE n.cast_id = $3::int
          AND n.type_id = 'inside'
          AND DATE(n.created_at) >= $1::date 
          AND DATE(n.created_at) < $2::date
        GROUP BY n.cast_id, DATE(n.created_at)
      ),
      nom_together AS (
        SELECT 
          n.cast_id AS user_id,
          DATE(n.created_at) AS date,
          COUNT(*) AS cnt,
          COALESCE(SUM(n.cost), 0) AS sum_cost,
          COALESCE(SUM(n.cost_cast), 0) AS sum_fee
        FROM nomination n
        WHERE n.cast_id = $3::int
          AND n.type_id = 'together'
          AND DATE(n.created_at) >= $1::date 
          AND DATE(n.created_at) < $2::date
        GROUP BY n.cast_id, DATE(n.created_at)
      ),
      sales_back AS (
        SELECT 
          so.cast_id AS user_id,
          DATE(so.accepted_at) AS date,
          COALESCE(SUM(
            CASE 
              WHEN so.castsalary_price IS NOT NULL AND so.castsalary_price > 0 THEN so.castsalary_price
              WHEN p.category_id IN (1, 2) THEN so.total_price * COALESCE(u.drink_back, 0) / 100.0
              WHEN p.category_id = 3 THEN so.total_price * COALESCE(u.food_back, 0) / 100.0
              ELSE 0
            END
          ), 0) AS sales_back_yen
        FROM salesorder so
        INNER JOIN "user" u ON u.id = so.cast_id AND u.role = 'cast'
        LEFT JOIN product p ON p.id = so.product_id
        WHERE so.cast_id = $3::int
          AND so.status = 'accepted'
          AND so.for_cast = 1
          AND so.cast_id IS NOT NULL
          AND DATE(so.accepted_at) >= $1::date 
          AND DATE(so.accepted_at) < $2::date
        GROUP BY so.cast_id, DATE(so.accepted_at)
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
        COALESCE(nm.sum_fee, 0)::DECIMAL(12,2) AS main_nomination_fee,
        COALESCE(ni.cnt, 0)::INT AS inside_nomination_count,
        COALESCE(ni.sum_fee, 0)::DECIMAL(12,2) AS inside_nomination_fee,
        COALESCE(nt.sum_cost, 0)::DECIMAL(12,2) AS together_nomination_cost,
        COALESCE(nt.cnt, 0)::INT AS together_nomination_count,
        COALESCE(nt.sum_fee, 0)::DECIMAL(12,2) AS together_nomination_fee,
        COALESCE(sb.sales_back_yen, 0)::DECIMAL(12,2) AS sales_back_yen,
        0::DECIMAL(12,2) AS overtime_wage_yen,
        0::DECIMAL(12,2) AS deduction_yen,
        0::DECIMAL(12,2) AS paid_price
      FROM date_series ds
      CROSS JOIN cast_info ci
      LEFT JOIN att att ON att.user_id = ci.user_id AND att.date = ds.date
      LEFT JOIN nom_main nm ON nm.user_id = ci.user_id AND nm.date = ds.date
      LEFT JOIN nom_inside ni ON ni.user_id = ci.user_id AND ni.date = ds.date
      LEFT JOIN nom_together nt ON nt.user_id = ci.user_id AND nt.date = ds.date
      LEFT JOIN sales_back sb ON sb.user_id = ci.user_id AND sb.date = ds.date
      ORDER BY ds.date
    `;

    const result = await client.query(sql, [startParam, rangeEndExclusive, userId]);

    const rows = result.rows.map((r: any) => {
      const total =
        Number(r.base_pay || 0) +
        Number(r.main_nomination_fee || 0) +
        Number(r.inside_nomination_fee || 0) +
        Number(r.together_nomination_fee || 0) +
        Number(r.sales_back_yen || 0) +
        Number(r.overtime_wage_yen || 0) -
        Number(r.deduction_yen || 0);
      return { 
        ...r, 
        date: r.date.toISOString().split('T')[0],
        total_pay_yen: total,
        realTotal_price: total - Number(r.paid_price || 0)
      };
    });

    return NextResponse.json({ success: true, rows });
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
