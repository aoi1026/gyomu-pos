import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const { id } = await params;
    const { cost, type_id, tomain_nomination, rank_cost_add, rank_point_add } = await request.json();

    if (cost === undefined && type_id === undefined && tomain_nomination === undefined && rank_cost_add === undefined && rank_point_add === undefined) {
      return NextResponse.json(
        { success: false, error: 'cost / type_id / tomain_nomination のいずれかが必要です' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // 現在の指名情報を取得（cast側取り分計算のため）
    const currentRes = await client.query(
      `
      SELECT
        id,
        cast_id,
        type_id,
        tomain_nomination,
        EXTRACT(YEAR FROM created_at)::int AS year,
        EXTRACT(MONTH FROM created_at)::int AS month
      FROM nomination
      WHERE id = $1
      `,
      [id]
    );
    if (currentRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: '指名が見つかりません' },
        { status: 404 }
      );
    }
    const current = currentRes.rows[0];
    const nextTypeId = type_id !== undefined ? String(type_id) : String(current.type_id);
    const nextToMain =
      tomain_nomination !== undefined
        ? Number(tomain_nomination) === 1
        : Number(current.tomain_nomination) === 1;
    // inside + tomain_nomination=1 は main 扱い（type_idはinsideのまま維持するため）
    const effectiveTypeId =
      nextTypeId === 'inside' && nextToMain ? 'main' : nextTypeId;

    let castShareAdd = 0;
    if (cost !== undefined) {
      const costAdd = parseFloat(cost);
      if (Number.isFinite(costAdd) && costAdd !== 0) {
        const rateRes = await client.query(
          `SELECT main_nomination, inside_nomination, together_nomination FROM "user" WHERE id = $1`,
          [current.cast_id]
        );
        const rates = rateRes.rows[0] || {};
        const ratePct =
          effectiveTypeId === 'main'
            ? Number(rates.main_nomination ?? 0)
            : effectiveTypeId === 'inside'
              ? Number(rates.inside_nomination ?? 0)
              : Number(rates.together_nomination ?? 0);
        castShareAdd = (costAdd * (Number.isFinite(ratePct) ? ratePct : 0)) / 100;
      }
    }

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (cost !== undefined) {
      updates.push(`cost = GREATEST(0, COALESCE(cost, 0) + $${idx++})`);
      values.push(parseFloat(cost));

      updates.push(`cost_cast = GREATEST(0, COALESCE(cost_cast, 0) + $${idx++})`);
      values.push(castShareAdd);
    }

    if (type_id !== undefined) {
      updates.push(`type_id = $${idx++}`);
      values.push(String(type_id));
    }

    if (tomain_nomination !== undefined) {
      updates.push(`tomain_nomination = $${idx++}`);
      values.push(Number(tomain_nomination) === 1 ? 1 : 0);
    }

    if (rank_cost_add !== undefined) {
      updates.push(`rank_cost = GREATEST(0, COALESCE(rank_cost, 0) + $${idx++})`);
      values.push(parseFloat(rank_cost_add));
    }

    if (rank_point_add !== undefined) {
      updates.push(`rank_point = GREATEST(0, COALESCE(rank_point, 0) + $${idx++})`);
      values.push(parseFloat(rank_point_add));
    }

    values.push(id);

    const result = await client.query(
      `UPDATE nomination SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: '指名が見つかりません' },
        { status: 404 }
      );
    }

    // cost_castに加算した増分（castShareAdd）を、salaryの指名料取り分にも反映（延長取り消しで負の加算も可）
    if (cost !== undefined && Number.isFinite(castShareAdd) && castShareAdd !== 0) {
      const year = Number(current.year);
      const month = Number(current.month);
      const castId = Number(current.cast_id);

      const addMainFee = effectiveTypeId === 'main' ? castShareAdd : 0;
      const addInsideFee = effectiveTypeId === 'inside' ? castShareAdd : 0;
      const addTogetherFee = effectiveTypeId === 'together' ? castShareAdd : 0;

      if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(castId) && castId > 0) {
        await client.query(
          `
          INSERT INTO salary (
            user_id,
            year,
            month,
            main_nomination_fee,
            inside_nomination_fee,
            together_nomination_fee
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (user_id, year, month)
          DO UPDATE SET
            main_nomination_fee = GREATEST(0, COALESCE(salary.main_nomination_fee, 0) + EXCLUDED.main_nomination_fee),
            inside_nomination_fee = GREATEST(0, COALESCE(salary.inside_nomination_fee, 0) + EXCLUDED.inside_nomination_fee),
            together_nomination_fee = GREATEST(0, COALESCE(salary.together_nomination_fee, 0) + EXCLUDED.together_nomination_fee)
          `,
          [castId, year, month, addMainFee, addInsideFee, addTogetherFee]
        );
      }
    }

    await client.query('COMMIT');
    return NextResponse.json({
      success: true,
      nomination: result.rows[0]
    });
  } catch (error) {
    console.error('指名更新エラー:', error);
    try { await client.query('ROLLBACK'); } catch {}
    return NextResponse.json(
      { success: false, error: '指名の更新に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

