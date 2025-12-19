import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = await pool.connect();
  try {
    const { cost, type_id, tomain_nomination, rank_cost_add, rank_point_add } = await request.json();

    if (cost === undefined && type_id === undefined && tomain_nomination === undefined && rank_cost_add === undefined && rank_point_add === undefined) {
      return NextResponse.json(
        { success: false, error: 'cost / type_id / tomain_nomination のいずれかが必要です' },
        { status: 400 }
      );
    }

    // 現在の指名情報を取得（cast側取り分計算のため）
    const currentRes = await client.query(
      `SELECT id, cast_id, type_id, tomain_nomination FROM nomination WHERE id = $1`,
      [params.id]
    );
    if (currentRes.rows.length === 0) {
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
      if (Number.isFinite(costAdd) && costAdd > 0) {
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
      updates.push(`cost = cost + $${idx++}`);
      values.push(parseFloat(cost));

      // cost_castも同じタイミングで加算
      updates.push(`cost_cast = COALESCE(cost_cast, 0) + $${idx++}`);
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
      updates.push(`rank_cost = COALESCE(rank_cost, 0) + $${idx++}`);
      values.push(parseFloat(rank_cost_add));
    }

    if (rank_point_add !== undefined) {
      updates.push(`rank_point = COALESCE(rank_point, 0) + $${idx++}`);
      values.push(parseFloat(rank_point_add));
    }

    values.push(params.id);

    const result = await client.query(
      `UPDATE nomination SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '指名が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      nomination: result.rows[0]
    });
  } catch (error) {
    console.error('指名更新エラー:', error);
    return NextResponse.json(
      { success: false, error: '指名の更新に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

