import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

// 出勤日数別金額設定を取得
export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('category_id');

    let query = `
      SELECT sa.id, sa.category_id, sa.attenday_number, sa.value, sa.other,
             c.name as category_name
      FROM salary_attenday sa
      JOIN category c ON sa.category_id = c.id
    `;
    const params: any[] = [];

    if (categoryId) {
      query += ' WHERE sa.category_id = $1';
      params.push(parseInt(categoryId));
    }

    query += ' ORDER BY sa.category_id, sa.attenday_number';

    const result = await client.query(query, params);

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('出勤日数別金額取得エラー:', error);
    return NextResponse.json(
      { success: false, error: '出勤日数別金額の取得に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// 出勤日数別金額設定を保存
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { category_id, attenday_number, value } = await request.json();

    if (!category_id || attenday_number === undefined || value === undefined) {
      return NextResponse.json(
        { success: false, error: 'すべての項目が必要です' },
        { status: 400 }
      );
    }

    if (attenday_number < 1 || attenday_number > 7) {
      return NextResponse.json(
        { success: false, error: '出勤日数は1～7日の範囲で指定してください' },
        { status: 400 }
      );
    }

    if (value < 0) {
      return NextResponse.json(
        { success: false, error: '金額は0以上の値を指定してください' },
        { status: 400 }
      );
    }

    // 既存データをチェック
    const existing = await client.query(
      'SELECT id FROM salary_attenday WHERE category_id = $1 AND attenday_number = $2',
      [category_id, attenday_number]
    );

    let result;
    if (existing.rows.length > 0) {
      // UPDATE
      result = await client.query(
        `UPDATE salary_attenday 
         SET value = $1, updated_at = CURRENT_TIMESTAMP
         WHERE category_id = $2 AND attenday_number = $3
         RETURNING *`,
        [value, category_id, attenday_number]
      );
    } else {
      // INSERT
      result = await client.query(
        `INSERT INTO salary_attenday (category_id, attenday_number, value)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [category_id, attenday_number, value]
      );
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('出勤日数別金額保存エラー:', error);
    if (error.code === '23503') {
      return NextResponse.json(
        { success: false, error: '存在しないカテゴリーIDです' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: '出勤日数別金額の保存に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// 出勤日数別金額設定を削除
export async function DELETE(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('category_id');

    if (!categoryId) {
      return NextResponse.json(
        { success: false, error: 'category_idが必要です' },
        { status: 400 }
      );
    }

    await client.query(
      'DELETE FROM salary_attenday WHERE category_id = $1',
      [parseInt(categoryId)]
    );

    return NextResponse.json({ success: true, message: '削除しました' });
  } catch (error) {
    console.error('出勤日数別金額削除エラー:', error);
    return NextResponse.json(
      { success: false, error: '削除に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

