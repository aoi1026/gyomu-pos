import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

// 個別ボトルキープ情報の更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = await pool.connect();
  try {
    const { client_name, client_email, bottle_name, amount, other } = await request.json();
    
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (client_name !== undefined) {
      updateFields.push(`client_name = $${paramIndex}`);
      values.push(client_name);
      paramIndex++;
    }

    if (client_email !== undefined) {
      updateFields.push(`client_email = $${paramIndex}`);
      values.push(client_email || null);
      paramIndex++;
    }

    if (bottle_name !== undefined) {
      updateFields.push(`bottle_name = $${paramIndex}`);
      values.push(bottle_name);
      paramIndex++;
    }

    if (amount !== undefined) {
      updateFields.push(`amount = $${paramIndex}`);
      values.push(amount);
      paramIndex++;
    }

    if (other !== undefined) {
      updateFields.push(`other = $${paramIndex}`);
      values.push(other || null);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { success: false, error: '更新するデータが必要です' },
        { status: 400 }
      );
    }

    values.push(params.id);

    const query = `UPDATE bottle_keep SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING *`;
    
    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ボトルが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('ボトル更新エラー:', error);
    return NextResponse.json(
      { success: false, error: 'ボトル情報の更新に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// 個別ボトルキープ情報の削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'DELETE FROM bottle_keep WHERE id = $1 RETURNING *',
      [params.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ボトルが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('ボトル削除エラー:', error);
    return NextResponse.json(
      { success: false, error: 'ボトルの削除に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

