import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const sessionId = searchParams.get('session_id');
    
    let query = `
      SELECT 
        so.*,
        u.name as cast_name,
        u.mail as cast_email,
        p.name as product_name,
        p.sale_price,
        t.name as table_name,
        s.id as session_id
      FROM salesorder so
      LEFT JOIN "user" u ON so.cast_id = u.id
      LEFT JOIN product p ON so.product_id = p.id
      LEFT JOIN "table" t ON so.table_id = t.id
      LEFT JOIN sessions s ON so.session_id = s.id
    `;
    
    const params = [];
    const conditions = [];
    
    if (status) {
      conditions.push('so.status = $' + (params.length + 1));
      params.push(status);
    }
    
    if (sessionId) {
      conditions.push('so.session_id = $' + (params.length + 1));
      params.push(sessionId);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY so.created_at DESC';
    
    const result = await client.query(query, params);
    
    return NextResponse.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('売上注文データ取得エラー:', error);
    return NextResponse.json(
      { success: false, error: '売上注文データの取得に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { cast_id, product_id, amount, table_id, session_id, for_cast } = await request.json();
    
    if (!product_id || !amount || !table_id || !session_id) {
      return NextResponse.json(
        { success: false, error: '必須項目が不足しています' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: '注文数量は1以上である必要があります' },
        { status: 400 }
      );
    }

    // トランザクション開始
    await client.query('BEGIN');

    try {
      // 商品情報を取得
      const productResult = await client.query(
        'SELECT id, name, sale_price, amount FROM product WHERE id = $1',
        [product_id]
      );

      if (productResult.rows.length === 0) {
        throw new Error('商品が見つかりません');
      }

      const product = productResult.rows[0];

      // 在庫チェック
      if (product.amount < amount) {
        throw new Error(`在庫不足です。利用可能数量: ${product.amount}`);
      }

      // 商品の在庫を減らす
      await client.query(
        'UPDATE product SET amount = amount - $1 WHERE id = $2',
        [amount, product_id]
      );

      // 売上注文を作成
      const unitPrice = parseFloat(product.sale_price);
      const totalPrice = unitPrice * amount;
      const forCastValue = for_cast ? 1 : 0;

      const salesOrderResult = await client.query(
        'INSERT INTO salesorder (cast_id, product_id, amount, table_id, session_id, unit_price, total_price, for_cast) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
        [cast_id || null, product_id, amount, table_id, session_id, unitPrice, totalPrice, forCastValue]
      );

      // トランザクションコミット
      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        data: salesOrderResult.rows[0]
      });
    } catch (error) {
      // トランザクションロールバック
      await client.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('売上注文作成エラー:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '売上注文の作成に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
