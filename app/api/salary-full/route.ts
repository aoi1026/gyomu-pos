import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

// 100%給与反映カテゴリを取得
export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT sf.id, sf.category_id, sf.other, sf.created_at, sf.updated_at,
             c.name as category_name
      FROM salary_full sf
      JOIN category c ON sf.category_id = c.id
      ORDER BY sf.id ASC
    `);

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('100%給与反映カテゴリ取得エラー:', error);
    return NextResponse.json(
      { success: false, error: '100%給与反映カテゴリの取得に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// 100%給与反映カテゴリを追加
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { category_id, other } = await request.json();

    if (!category_id) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: 'category_idが必要です' },
        { status: 400 }
      );
    }

    // salary_fullテーブルに保存
    const result = await client.query(
      `INSERT INTO salary_full (category_id, other)
       VALUES ($1, $2)
       ON CONFLICT (category_id) DO UPDATE
       SET other = $2, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [category_id, other || null]
    );

    // 全ユーザーに対してsalary_categoryテーブルにvalue=-1で保存
    const usersResult = await client.query(
      'SELECT id FROM "user" ORDER BY id'
    );

    if (usersResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: 'ユーザーが見つかりません' },
        { status: 400 }
      );
    }

    // 全ユーザーに対してsalary_categoryテーブルにvalue=-1で保存
    // まず制約を確認し、必要に応じて更新
    try {
      // 制約が存在するか確認し、必要に応じて更新
      const constraintCheck = await client.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'salary_category'
        AND constraint_type = 'CHECK'
        AND constraint_name LIKE '%value%'
      `);
      
      if (constraintCheck.rows.length > 0) {
        // 制約を一時的に削除して再作成（-1を許可）
        for (const row of constraintCheck.rows) {
          await client.query(`ALTER TABLE salary_category DROP CONSTRAINT IF EXISTS ${row.constraint_name}`);
        }
        await client.query(`ALTER TABLE salary_category ADD CONSTRAINT salary_category_value_check CHECK (value >= -1)`);
      }
    } catch (constraintError: any) {
      // 制約の更新に失敗した場合は続行（既に正しい制約が設定されている可能性がある）
      console.warn('制約の更新に失敗しました（既に正しい制約が設定されている可能性があります）:', constraintError.message);
    }

    // UNIQUE制約がないため、既存データをチェックしてからINSERT/UPDATE
    for (const user of usersResult.rows) {
      // 既存データをチェック
      const existing = await client.query(
        'SELECT id FROM salary_category WHERE cast_id = $1 AND category_id = $2',
        [user.id, category_id]
      );

      if (existing.rows.length > 0) {
        // UPDATE
        await client.query(
          `UPDATE salary_category 
           SET value = -1, updated_at = CURRENT_TIMESTAMP
           WHERE cast_id = $1 AND category_id = $2`,
          [user.id, category_id]
        );
      } else {
        // INSERT
        await client.query(
          `INSERT INTO salary_category (cast_id, category_id, value)
           VALUES ($1, $2, -1)`,
          [user.id, category_id]
        );
      }
    }

    await client.query('COMMIT');
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('100%給与反映カテゴリ保存エラー:', error);
    if (error.code === '23503') {
      return NextResponse.json(
        { success: false, error: '存在しないカテゴリーIDです' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: '100%給与反映カテゴリの保存に失敗しました: ' + (error.message || '不明なエラー') },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// 100%給与反映カテゴリを削除
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

    // salary_categoryテーブルから該当カテゴリーのデータを削除
    await client.query(
      'DELETE FROM salary_category WHERE category_id = $1 AND value = -1',
      [parseInt(categoryId)]
    );

    // salary_fullテーブルから削除
    await client.query(
      'DELETE FROM salary_full WHERE category_id = $1',
      [parseInt(categoryId)]
    );

    return NextResponse.json({ success: true, message: '削除しました' });
  } catch (error) {
    console.error('100%給与反映カテゴリ削除エラー:', error);
    return NextResponse.json(
      { success: false, error: '削除に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
