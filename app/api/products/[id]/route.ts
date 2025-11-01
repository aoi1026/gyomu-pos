import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { name, sku, sale_price, amount, other, category_id } = await request.json();
    const productId = parseInt(params.id);

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: '商品名は必須です。' },
        { status: 400 }
      );
    }

    if (!sku || sku.trim() === '') {
      return NextResponse.json(
        { error: 'SKUは必須です。' },
        { status: 400 }
      );
    }

    if (sale_price === undefined || sale_price < 0) {
      return NextResponse.json(
        { error: '販売価格は0以上である必要があります。' },
        { status: 400 }
      );
    }

    if (amount === undefined || amount < 0) {
      return NextResponse.json(
        { error: '在庫量は0以上である必要があります。' },
        { status: 400 }
      );
    }

    if (!category_id) {
      return NextResponse.json(
        { error: 'カテゴリIDは必須です。' },
        { status: 400 }
      );
    }

    if (isNaN(productId)) {
      return NextResponse.json(
        { error: '無効な商品IDです。' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      // 商品の存在確認
      const existingProduct = await client.query(
        'SELECT id FROM product WHERE id = $1',
        [productId]
      );

      if (existingProduct.rows.length === 0) {
        return NextResponse.json(
          { error: '指定された商品が見つかりません。' },
          { status: 404 }
        );
      }

      // カテゴリの存在確認
      const categoryCheck = await client.query(
        'SELECT id FROM category WHERE id = $1',
        [category_id]
      );

      if (categoryCheck.rows.length === 0) {
        return NextResponse.json(
          { error: '指定されたカテゴリが見つかりません。' },
          { status: 404 }
        );
      }

      // SKUの重複チェック（自分以外）
      const skuCheck = await client.query(
        'SELECT id FROM product WHERE sku = $1 AND id != $2',
        [sku.trim(), productId]
      );

      if (skuCheck.rows.length > 0) {
        return NextResponse.json(
          { error: 'このSKUは既に存在します。' },
          { status: 409 }
        );
      }

      // 商品を更新
      const result = await client.query(
        'UPDATE product SET name = $1, sku = $2, sale_price = $3, amount = $4, other = $5, category_id = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING id, name, sku, sale_price, amount, other, category_id, created_at, updated_at',
        [name.trim(), sku.trim(), sale_price, amount, other || '', category_id, productId]
      );

      // カテゴリ名も取得
      const categoryResult = await client.query(
        'SELECT name FROM category WHERE id = $1',
        [category_id]
      );

      const updatedProduct = {
        id: result.rows[0].id,
        name: result.rows[0].name,
        sku: result.rows[0].sku,
        sale_price: parseFloat(result.rows[0].sale_price),
        amount: result.rows[0].amount,
        other: result.rows[0].other || '',
        category_id: result.rows[0].category_id,
        category_name: categoryResult.rows[0].name,
        created_at: result.rows[0].created_at,
        updated_at: result.rows[0].updated_at
      };

      return NextResponse.json({ 
        success: true, 
        product: updatedProduct,
        message: '商品を更新しました。' 
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('商品更新エラー:', error);
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
    const productId = parseInt(params.id);

    if (isNaN(productId)) {
      return NextResponse.json(
        { error: '無効な商品IDです。' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      // 商品の存在確認
      const existingProduct = await client.query(
        'SELECT id FROM product WHERE id = $1',
        [productId]
      );

      if (existingProduct.rows.length === 0) {
        return NextResponse.json(
          { error: '指定された商品が見つかりません。' },
          { status: 404 }
        );
      }

      // 商品を削除
      await client.query(
        'DELETE FROM product WHERE id = $1',
        [productId]
      );

      return NextResponse.json({ 
        success: true,
        message: '商品を削除しました。' 
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('商品削除エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました。' },
      { status: 500 }
    );
  }
}
