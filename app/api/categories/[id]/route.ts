import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { name, other, image } = await request.json();
    const categoryId = parseInt(params.id);

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'カテゴリ名は必須です。' },
        { status: 400 }
      );
    }

    if (isNaN(categoryId)) {
      return NextResponse.json(
        { error: '無効なカテゴリIDです。' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      // カテゴリの存在確認
      const existingCategory = await client.query(
        'SELECT id FROM category WHERE id = $1',
        [categoryId]
      );

      if (existingCategory.rows.length === 0) {
        return NextResponse.json(
          { error: '指定されたカテゴリが見つかりません。' },
          { status: 404 }
        );
      }

      // カテゴリ名の重複チェック（自分以外）
      const duplicateCheck = await client.query(
        'SELECT id FROM category WHERE name = $1 AND id != $2',
        [name.trim(), categoryId]
      );

      if (duplicateCheck.rows.length > 0) {
        return NextResponse.json(
          { error: 'このカテゴリ名は既に存在します。' },
          { status: 409 }
        );
      }

      // カテゴリを更新
      const result = await client.query(
        'UPDATE category SET name = $1, image = $2, other = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING id, name, image, other, created_at, updated_at',
        [name.trim(), image || null, other || '', categoryId]
      );

      const updatedCategory = {
        id: result.rows[0].id,
        name: result.rows[0].name,
        image: result.rows[0].image ?? null,
        other: result.rows[0].other || '',
        created_at: result.rows[0].created_at,
        updated_at: result.rows[0].updated_at
      };

      return NextResponse.json({ 
        success: true, 
        category: updatedCategory,
        message: 'カテゴリを更新しました。' 
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('カテゴリ更新エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました。' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const categoryId = parseInt(params.id);

    if (isNaN(categoryId)) {
      return NextResponse.json(
        { error: '無効なカテゴリIDです。' },
        { status: 400 }
      );
    }

    // 固定カテゴリ(ID:1,2)は削除不可
    if (categoryId === 1 || categoryId === 2) {
      return NextResponse.json(
        { error: 'このカテゴリは固定のため削除できません。' },
        { status: 403 }
      );
    }

    const client = await pool.connect();
    
    try {
      // カテゴリの存在確認
      const existingCategory = await client.query(
        'SELECT id FROM category WHERE id = $1',
        [categoryId]
      );

      if (existingCategory.rows.length === 0) {
        return NextResponse.json(
          { error: '指定されたカテゴリが見つかりません。' },
          { status: 404 }
        );
      }

      // 関連する商品があるかチェック
      const relatedProducts = await client.query(
        'SELECT COUNT(*) as count FROM product WHERE category_id = $1',
        [categoryId]
      );

      if (parseInt(relatedProducts.rows[0].count) > 0) {
        return NextResponse.json(
          { error: 'このカテゴリに関連する商品が存在するため削除できません。' },
          { status: 409 }
        );
      }

      // カテゴリを削除
      await client.query(
        'DELETE FROM category WHERE id = $1',
        [categoryId]
      );

      return NextResponse.json({ 
        success: true,
        message: 'カテゴリを削除しました。' 
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('カテゴリ削除エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました。' },
      { status: 500 }
    );
  }
}
