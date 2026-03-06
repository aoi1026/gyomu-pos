import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

// 給与カテゴリ設定を取得
export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const castId = searchParams.get('cast_id');
    const categoryId = searchParams.get('category_id');
    const type = searchParams.get('type'); // 'back_rate' or 'full_reflect'

    let query = `
      SELECT sc.id, sc.cast_id, sc.category_id, sc.value, sc.other,
             u.name as cast_name,
             c.name as category_name
      FROM salary_category sc
      JOIN "user" u ON sc.cast_id = u.id
      JOIN category c ON sc.category_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (castId) {
      query += ` AND sc.cast_id = $${paramIndex++}`;
      params.push(parseInt(castId));
    }

    if (categoryId) {
      query += ` AND sc.category_id = $${paramIndex++}`;
      params.push(parseInt(categoryId));
    }

    if (type === 'back_rate') {
      query += ` AND sc.value >= 0 AND sc.value < 1`;
    } else if (type === 'full_reflect') {
      query += ` AND sc.value = -1`;
    }

    query += ' ORDER BY sc.cast_id, sc.category_id';

    const result = await client.query(query, params);

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('給与カテゴリ取得エラー:', error);
    return NextResponse.json(
      { success: false, error: '給与カテゴリの取得に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// 給与カテゴリ設定を保存（複数キャストに一括保存）
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { category_id, value, cast_ids } = await request.json();

    if (!category_id || value === undefined) {
      return NextResponse.json(
        { success: false, error: 'category_idとvalueが必要です' },
        { status: 400 }
      );
    }

    if (value < -1 || value >= 1) {
      return NextResponse.json(
        { success: false, error: 'valueは-1または0以上1未満の値を指定してください' },
        { status: 400 }
      );
    }

    // cast_idsが指定されている場合はそのキャストのみ、指定されていない場合は全キャスト
    let targetCastIds: number[] = [];
    if (cast_ids && cast_ids.length > 0) {
      targetCastIds = cast_ids;
    } else {
      const castsResult = await client.query(
        'SELECT id FROM "user" WHERE role = $1',
        ['cast']
      );
      targetCastIds = castsResult.rows.map((row: any) => row.id);
    }

    // 各キャストに対してUPSERT
    const results = [];
    for (const castId of targetCastIds) {
      // 既存データをチェック
      const existing = await client.query(
        'SELECT id FROM salary_category WHERE cast_id = $1 AND category_id = $2',
        [castId, category_id]
      );

      let result;
      if (existing.rows.length > 0) {
        // UPDATE
        result = await client.query(
          `UPDATE salary_category 
           SET value = $1, updated_at = CURRENT_TIMESTAMP
           WHERE cast_id = $2 AND category_id = $3
           RETURNING *`,
          [value, castId, category_id]
        );
      } else {
        // INSERT
        result = await client.query(
          `INSERT INTO salary_category (cast_id, category_id, value)
           VALUES ($1, $2, $3)
           RETURNING *`,
          [castId, category_id, value]
        );
      }
      results.push(result.rows[0]);
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    console.error('給与カテゴリ保存エラー:', error);
    if (error.code === '23503') {
      return NextResponse.json(
        { success: false, error: '存在しないキャストIDまたはカテゴリーIDです' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: '給与カテゴリの保存に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// 給与カテゴリ設定を更新（単一キャストの単一カテゴリ）
export async function PUT(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { cast_id, category_id, value } = await request.json();

    if (!cast_id || !category_id || value === undefined) {
      return NextResponse.json(
        { success: false, error: 'cast_id, category_id, valueが必要です' },
        { status: 400 }
      );
    }

    if (value < -1 || value >= 1) {
      return NextResponse.json(
        { success: false, error: 'valueは-1または0以上1未満の値を指定してください' },
        { status: 400 }
      );
    }

    const result = await client.query(
      `UPDATE salary_category
       SET value = $1, updated_at = CURRENT_TIMESTAMP
       WHERE cast_id = $2 AND category_id = $3
       RETURNING *`,
      [value, cast_id, category_id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: '該当する設定が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('給与カテゴリ更新エラー:', error);
    return NextResponse.json(
      { success: false, error: '給与カテゴリの更新に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// 給与カテゴリ設定を削除
export async function DELETE(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('category_id');
    const type = searchParams.get('type'); // 'back_rate' or 'full_reflect'

    if (!categoryId) {
      return NextResponse.json(
        { success: false, error: 'category_idが必要です' },
        { status: 400 }
      );
    }

    let query = 'DELETE FROM salary_category WHERE category_id = $1';
    const params: any[] = [parseInt(categoryId)];

    if (type === 'back_rate') {
      query += ' AND value >= 0 AND value < 1';
    } else if (type === 'full_reflect') {
      query += ' AND value = -1';
    }

    await client.query(query, params);

    return NextResponse.json({ success: true, message: '削除しました' });
  } catch (error) {
    console.error('給与カテゴリ削除エラー:', error);
    return NextResponse.json(
      { success: false, error: '削除に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

