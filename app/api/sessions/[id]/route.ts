import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = await pool.connect();
  try {
    const { cast_id, nomination_type, cost, end_at } = await request.json();
    
    if (!cast_id && !nomination_type && cost === undefined && !end_at) {
      return NextResponse.json(
        { success: false, error: '更新するデータが必要です' },
        { status: 400 }
      );
    }

    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (cast_id !== undefined) {
      updateFields.push(`cast_id = $${paramIndex}`);
      values.push(cast_id);
      paramIndex++;
    }

    if (nomination_type !== undefined) {
      updateFields.push(`nomination_type = $${paramIndex}`);
      values.push(nomination_type);
      paramIndex++;
    }

    if (cost !== undefined) {
      updateFields.push(`cost = $${paramIndex}`);
      values.push(cost);
      paramIndex++;
    }

    if (end_at) {
      updateFields.push(`end_at = $${paramIndex}`);
      values.push(end_at);
      paramIndex++;
    }

    values.push(params.id);

    const query = `UPDATE sessions SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    
    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'セッションが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('セッション更新エラー:', error);
    return NextResponse.json(
      { success: false, error: 'セッションの更新に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
