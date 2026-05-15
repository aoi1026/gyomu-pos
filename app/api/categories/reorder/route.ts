import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';
import { ensureCategorySortOrderColumn } from '@/lib/category-db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const categoryId = Number(body?.id);
    const direction = body?.direction;

    if (!Number.isFinite(categoryId) || categoryId <= 0) {
      return NextResponse.json(
        { success: false, error: 'カテゴリIDが不正です。' },
        { status: 400 }
      );
    }

    if (direction !== 'up' && direction !== 'down') {
      return NextResponse.json(
        { success: false, error: 'direction は up または down を指定してください。' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await ensureCategorySortOrderColumn(client);

      const listResult = await client.query(
        `SELECT id, sort_order FROM category ORDER BY sort_order ASC, id ASC`
      );
      const rows = listResult.rows as Array<{ id: number; sort_order: number }>;
      const index = rows.findIndex((r) => r.id === categoryId);

      if (index < 0) {
        return NextResponse.json(
          { success: false, error: '指定されたカテゴリが見つかりません。' },
          { status: 404 }
        );
      }

      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= rows.length) {
        return NextResponse.json({
          success: true,
          message: 'これ以上移動できません。',
          unchanged: true,
        });
      }

      const current = rows[index];
      const neighbor = rows[swapIndex];

      await client.query('BEGIN');
      await client.query(
        `UPDATE category SET sort_order = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [neighbor.sort_order, current.id]
      );
      await client.query(
        `UPDATE category SET sort_order = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [current.sort_order, neighbor.id]
      );
      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: '表示順序を更新しました。',
      });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('カテゴリ並び替えエラー:', error);
    return NextResponse.json(
      { success: false, error: '表示順序の更新に失敗しました。' },
      { status: 500 }
    );
  }
}
