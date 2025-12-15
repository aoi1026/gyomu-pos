import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = await pool.connect();
  try {
    const { cost, end_at, set_count, client: clientCount, status, set_extensions, is_paused, paused_at, paused_elapsed, created_at } = await request.json();
    
    if (cost === undefined && !end_at && set_count === undefined && clientCount === undefined && status === undefined && set_extensions === undefined && is_paused === undefined && !paused_at && paused_elapsed === undefined && !created_at) {
      return NextResponse.json(
        { success: false, error: '更新するデータが必要です' },
        { status: 400 }
      );
    }

    const updateFields = [];
    const values = [];
    let paramIndex = 1;

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

    if (set_count !== undefined) {
      updateFields.push(`set_count = $${paramIndex}`);
      values.push(set_count);
      paramIndex++;
    }

    if (clientCount !== undefined) {
      updateFields.push(`client = $${paramIndex}`);
      values.push(clientCount);
      paramIndex++;
    }

    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    if (set_extensions !== undefined) {
      updateFields.push(`set_extensions = $${paramIndex}::jsonb`);
      values.push(JSON.stringify(set_extensions));
      paramIndex++;
    }

    if (is_paused !== undefined) {
      updateFields.push(`is_paused = $${paramIndex}`);
      values.push(is_paused);
      paramIndex++;
    }

    if (paused_at !== undefined) {
      updateFields.push(`paused_at = $${paramIndex}`);
      values.push(paused_at);
      paramIndex++;
    }

    if (paused_elapsed !== undefined) {
      updateFields.push(`paused_elapsed = $${paramIndex}`);
      values.push(paused_elapsed);
      paramIndex++;
    }

    if (created_at) {
      updateFields.push(`created_at = $${paramIndex}`);
      values.push(created_at);
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

    // set_extensionsをJSONからパース
    const row = result.rows[0];
    if (row.set_extensions) {
      try {
        row.set_extensions = typeof row.set_extensions === 'string' 
          ? JSON.parse(row.set_extensions) 
          : row.set_extensions;
      } catch (e) {
        row.set_extensions = [];
      }
    } else {
      row.set_extensions = [];
    }

    return NextResponse.json({
      success: true,
      data: row
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
