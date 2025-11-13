import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

function ymStart(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}-01`;
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
        SELECT id AS user_id, name, mail AS email, hourly_price, main_nomination, inside_nomination, together_nomination, drink_back, food_back
        FROM "user"
        WHERE role = 'cast'
      ),
      att AS (
        SELECT a.staff_id AS user_id, COALESCE(SUM(a.total_work_hours), 0) AS hours
        FROM attendance a
        WHERE a.created_at >= $1::date AND a.created_at < ${endExpr}
        GROUP BY a.staff_id
      ),
      nom_main AS (
        SELECT n.cast_id AS user_id, COALESCE(SUM(n.cost), 0) AS total_cost
        FROM nomination n
        WHERE n.type_id = 'main'
          AND n.created_at >= $1::date AND n.created_at < ${endExpr}
        GROUP BY n.cast_id
      ),
      nom_inside AS (
        SELECT n.cast_id AS user_id, COALESCE(SUM(n.cost), 0) AS total_cost
        FROM nomination n
        WHERE n.type_id = 'inside'
          AND n.created_at >= $1::date AND n.created_at < ${endExpr}
        GROUP BY n.cast_id
      ),
      nom_together AS (
        SELECT 
          n.cast_id AS user_id, 
          COUNT(*) AS cnt,
          COALESCE(SUM(n.cost), 0) AS sum_cost
        FROM nomination n
        WHERE n.type_id = 'together'
          AND n.created_at >= $1::date AND n.created_at < ${endExpr}
        GROUP BY n.cast_id
      ),
      ac AS (
        SELECT COALESCE(value, 0) AS together_unit
        FROM add_charges 
        WHERE charge_name = 'together'
        LIMIT 1
      ),
      so_drink AS (
        SELECT so.cast_id AS user_id, COALESCE(SUM(so.total_price), 0) AS total
        FROM salesorder so
        JOIN product p ON p.id = so.product_id
        WHERE p.category_id IN (1, 2)
          AND so.for_cast = 1
          AND so.status = 'accepted'
          AND so.accepted_at >= $1::date AND so.accepted_at < ${endExpr}
        GROUP BY so.cast_id
      ),
      so_food AS (
        SELECT so.cast_id AS user_id, COALESCE(SUM(so.total_price), 0) AS total
        FROM salesorder so
        JOIN product p ON p.id = so.product_id
        WHERE p.category_id = 3
          AND so.for_cast = 1
          AND so.status = 'accepted'
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
        COALESCE(att.hours, 0)::DECIMAL(10,2) AS basic_hours,
        c.hourly_price,
        (COALESCE(att.hours, 0) * COALESCE(c.hourly_price, 0))::DECIMAL(12,2) AS base_pay,
        COALESCE(sal.main_nomination_count, COALESCE(nm.total_cost, 0))::DECIMAL(12,2) AS main_nomination_count,
        (COALESCE(sal.main_nomination_count, COALESCE(nm.total_cost, 0)) * COALESCE(c.main_nomination, 0))::DECIMAL(12,2) AS main_nomination_fee,
        COALESCE(sal.inside_nomination_count, COALESCE(ni.total_cost, 0))::DECIMAL(12,2) AS inside_nomination_count,
        (COALESCE(sal.inside_nomination_count, COALESCE(ni.total_cost, 0)) * COALESCE(c.inside_nomination, 0))::DECIMAL(12,2) AS inside_nomination_fee,
        COALESCE(sal.together_nomination_cost, COALESCE(nt.sum_cost, 0))::DECIMAL(12,2) AS together_nomination_cost,
        COALESCE(nt.cnt, 0)::INT AS together_nomination_count,
        (
          (COALESCE(ac.together_unit, 0) * COALESCE(nt.cnt, 0) * COALESCE(c.together_nomination, 0)) +
          ((COALESCE(nt.sum_cost, 0) - (COALESCE(ac.together_unit, 0) * COALESCE(nt.cnt, 0))) * COALESCE(c.main_nomination, 0))
        )::DECIMAL(12,2) AS together_nomination_fee,
        COALESCE(sal.drink_back_yen, (COALESCE(sd.total, 0) * COALESCE(c.drink_back, 0)))::DECIMAL(12,2) AS drink_back_yen,
        COALESCE(sal.food_back_yen, (COALESCE(sf.total, 0) * COALESCE(c.food_back, 0)))::DECIMAL(12,2) AS food_back_yen,
        COALESCE(sal.overtime_wage_yen, 0)::DECIMAL(12,2) AS overtime_wage_yen,
        COALESCE(sal.deduction_yen, 0)::DECIMAL(12,2) AS deduction_yen
      FROM casts c
      LEFT JOIN att att ON att.user_id = c.user_id
      LEFT JOIN nom_main nm ON nm.user_id = c.user_id
      LEFT JOIN nom_inside ni ON ni.user_id = c.user_id
      LEFT JOIN nom_together nt ON nt.user_id = c.user_id
      LEFT JOIN so_drink sd ON sd.user_id = c.user_id
      LEFT JOIN so_food sf ON sf.user_id = c.user_id
      LEFT JOIN sal sal ON sal.user_id = c.user_id
      LEFT JOIN ac ac ON TRUE
      ORDER BY c.name
      `,
      [start, year, month]
    );

    const rows = result.rows.map((r: any) => {
      const total =
        Number(r.base_pay || 0) +
        Number(r.main_nomination_fee || 0) +
        Number(r.inside_nomination_fee || 0) +
        Number(r.together_nomination_fee || 0) +
        Number(r.drink_back_yen || 0) +
        Number(r.food_back_yen || 0) +
        Number(r.overtime_wage_yen || 0) -
        Number(r.deduction_yen || 0);
      return { ...r, total_pay_yen: total };
    });

    return NextResponse.json({ success: true, year, month, rows });
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
    const { user_id, year, month, basic_hours, main_nomination_count, inside_nomination_count, together_nomination_cost, together_nomination_count, drink_back_yen, food_back_yen, overtime_wage_yen, deduction_yen, base_pay, main_nomination_fee, inside_nomination_fee, together_nomination_fee } = body;
    if (!user_id || !year || !month) {
      return NextResponse.json({ success: false, error: 'user_id, year, month は必須です' }, { status: 400 });
    }

    await client.query('BEGIN');
    const upsert = await client.query(
      `
      INSERT INTO salary (user_id, year, month, basic_hours, base_pay, main_nomination_count, main_nomination_fee, inside_nomination_count, inside_nomination_fee, together_nomination_cost, together_nomination_count, together_nomination_fee, drink_back_yen, food_back_yen, overtime_wage_yen, deduction_yen, total_pay_yen)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
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
        drink_back_yen = EXCLUDED.drink_back_yen,
        food_back_yen = EXCLUDED.food_back_yen,
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
        together_nomination_cost ?? 0,
        together_nomination_count ?? 0,
        together_nomination_fee ?? 0,
        drink_back_yen ?? 0,
        food_back_yen ?? 0,
        overtime_wage_yen ?? 0,
        deduction_yen ?? 0,
        (Number(base_pay || 0) + Number(main_nomination_fee || 0) + Number(inside_nomination_fee || 0) + Number(together_nomination_fee || 0) + Number(drink_back_yen || 0) + Number(food_back_yen || 0) + Number(overtime_wage_yen || 0) - Number(deduction_yen || 0))
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


