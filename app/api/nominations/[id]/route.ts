import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = await pool.connect();
  try {
    const { cost } = await request.json();
    
    if (cost === undefined) {
      return NextResponse.json(
        { success: false, error: 'cost は必須です' },
        { status: 400 }
      );
    }

    const result = await client.query(
      'UPDATE nomination SET cost = cost + $1 WHERE id = $2 RETURNING *',
      [parseFloat(cost), params.id]
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

