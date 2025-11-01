import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('category_id');

    const client = await pool.connect();
    
    try {
      let query = `
        SELECT p.id, p.name, p.sku, p.sale_price, p.amount, p.other, p.created_at, p.updated_at,
               c.name as category_name, c.id as category_id
        FROM product p
        JOIN category c ON p.category_id = c.id
      `;
      let params: any[] = [];

      if (categoryId) {
        query += ' WHERE p.category_id = $1';
        params.push(parseInt(categoryId));
      }

      query += ' ORDER BY c.name, p.name';

      const result = await client.query(query, params);

      const products = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        sku: row.sku,
        sale_price: parseFloat(row.sale_price),
        amount: row.amount,
        other: row.other || '',
        category_id: row.category_id,
        category_name: row.category_name,
        created_at: row.created_at,
        updated_at: row.updated_at
      }));

      return NextResponse.json({ success: true, products });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('商品取得エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました。' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, sku, sale_price, amount, other, category_id } = await request.json();

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

    const client = await pool.connect();
    
    try {
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

      // SKUの重複チェック
      const skuCheck = await client.query(
        'SELECT id FROM product WHERE sku = $1',
        [sku.trim()]
      );

      if (skuCheck.rows.length > 0) {
        return NextResponse.json(
          { error: 'このSKUは既に存在します。' },
          { status: 409 }
        );
      }

      // 商品を追加
      const result = await client.query(
        'INSERT INTO product (name, sku, sale_price, amount, other, category_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, sku, sale_price, amount, other, category_id, created_at, updated_at',
        [name.trim(), sku.trim(), sale_price, amount, other || '', category_id]
      );

      // カテゴリ名も取得
      const categoryResult = await client.query(
        'SELECT name FROM category WHERE id = $1',
        [category_id]
      );

      const newProduct = {
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
        product: newProduct,
        message: '商品を追加しました。' 
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('商品追加エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました。' },
      { status: 500 }
    );
  }
}
