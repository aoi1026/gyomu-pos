import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT id, name, other, created_at, updated_at FROM category ORDER BY name'
      );

      const categories = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        other: row.other || '',
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
    const { name, other } = await request.json();

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'カテゴリ名は必須です。' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
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

      // カテゴリを追加
      const result = await client.query(
        'INSERT INTO category (name, other) VALUES ($1, $2) RETURNING id, name, other, created_at, updated_at',
        [name.trim(), other || '']
      );

      const newCategory = {
        id: result.rows[0].id,
        name: result.rows[0].name,
        other: result.rows[0].other || '',
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
