import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export const dynamic = 'force-dynamic';

function toInt(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const year = toInt(searchParams.get('year'));
    const month = toInt(searchParams.get('month'));

    if (!year || !month || month < 1 || month > 12) {
      return NextResponse.json(
        { success: false, error: 'year と month(1-12) が必要です' },
        { status: 400 }
      );
    }

    const result = await client.query(
      `
      WITH bounds AS (
        SELECT
          make_timestamptz($1, $2, 1, 0, 0, 0, 'Asia/Tokyo') AS start_ts,
          (make_timestamptz($1, $2, 1, 0, 0, 0, 'Asia/Tokyo') + interval '1 month') AS end_ts
      ),
      casts AS (
        SELECT id, name
          FROM "user"
         WHERE role = 'cast'
      ),
      attendance_days AS (
        SELECT
          a.staff_id AS cast_id,
          COUNT(DISTINCT (a.clock_in AT TIME ZONE 'Asia/Tokyo')::date) AS days
        FROM attendance a, bounds b
        WHERE a.status = 'saved'
          AND a.clock_in >= b.start_ts
          AND a.clock_in < b.end_ts
        GROUP BY a.staff_id
      ),
      nomination_counts AS (
        SELECT
          n.cast_id,
          COUNT(*) FILTER (WHERE n.type_id = 'together') AS together_count,
          COUNT(*) FILTER (WHERE n.type_id = 'main') AS main_count,
          COUNT(*) FILTER (WHERE n.type_id = 'inside') AS inside_count,
          COALESCE(SUM(n.rank_cost), 0) AS main_sales,
          COALESCE(SUM(n.rank_point), 0) AS points
        FROM nomination n, bounds b
        WHERE n.created_at >= b.start_ts
          AND n.created_at < b.end_ts
        GROUP BY n.cast_id
      )
      SELECT
        c.id AS cast_id,
        c.name AS cast_name,
        COALESCE(ad.days, 0) AS attendance_days,
        COALESCE(nc.together_count, 0) AS together_count,
        COALESCE(nc.main_count, 0) AS main_count,
        COALESCE(nc.inside_count, 0) AS inside_count,
        COALESCE(nc.main_sales, 0) AS main_sales,
        COALESCE(nc.points, 0) AS points
      FROM casts c
      LEFT JOIN attendance_days ad ON ad.cast_id = c.id
      LEFT JOIN nomination_counts nc ON nc.cast_id = c.id
      ORDER BY points DESC, main_sales DESC, attendance_days DESC, cast_name ASC
      `,
      [year, month]
    );

    // rank付与（1から一意に増加）
    const rows = result.rows.map((r: any, idx: number) => ({
      rank: idx + 1,
      cast_id: Number(r.cast_id),
      cast_name: String(r.cast_name),
      attendance_days: Number(r.attendance_days) || 0,
      together_count: Number(r.together_count) || 0,
      main_count: Number(r.main_count) || 0,
      inside_count: Number(r.inside_count) || 0,
      main_sales: Number(r.main_sales) || 0,
      points: Number(r.points) || 0,
    }));

    return NextResponse.json({
      success: true,
      data: {
        year,
        month,
        rows,
      },
    });
  } catch (e) {
    console.error('キャストランキング取得エラー:', e);
    return NextResponse.json(
      { success: false, error: 'キャストランキングの取得に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}


