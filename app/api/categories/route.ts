import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';
import { ensureCategorySortOrderColumn } from '@/lib/category-db';

export async function GET(request: NextRequest) {
  try {
    const client = await pool.connect();
    
    try {
      await ensureCategorySortOrderColumn(client);

      const result = await client.query(
        `SELECT id, name, image, other, sort_order, created_at, updated_at
           FROM category
          ORDER BY sort_order ASC, id ASC`
      );

      const categories = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        image: row.image ?? null,
        other: row.other || '',
        sort_order: Number(row.sort_order) || 0,
        created_at: row.created_at,
        updated_at: row.updated_at
      }));

      return NextResponse.json({ success: true, categories });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('カテゴリ取得エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました。' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, other, image } = await request.json();

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'カテゴリ名は必須です。' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      await ensureCategorySortOrderColumn(client);

      // カテゴリ名の重複チェック
      const existingCategory = await client.query(
        'SELECT id FROM category WHERE name = $1',
        [name.trim()]
      );

      if (existingCategory.rows.length > 0) {
        return NextResponse.json(
          { error: 'このカテゴリ名は既に存在します。' },
          { status: 409 }
        );
      }

      const maxOrder = await client.query(
        `SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM category`
      );
      const nextOrder = Number(maxOrder.rows[0]?.max_order ?? 0) + 1;

      // カテゴリを追加
      const result = await client.query(
        `INSERT INTO category (name, image, other, sort_order)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, image, other, sort_order, created_at, updated_at`,
        [name.trim(), image || null, other || '', nextOrder]
      );

      const newCategory = {
        id: result.rows[0].id,
        name: result.rows[0].name,
        image: result.rows[0].image ?? null,
        other: result.rows[0].other || '',
        sort_order: Number(result.rows[0].sort_order) || 0,
        created_at: result.rows[0].created_at,
        updated_at: result.rows[0].updated_at
      };

      return NextResponse.json({ 
        success: true, 
        category: newCategory,
        message: 'カテゴリを追加しました。' 
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('カテゴリ追加エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました。' },
      { status: 500 }
    );
  }
}
