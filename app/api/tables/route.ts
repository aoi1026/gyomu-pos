import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';
import { resolveCapacityInput } from '@/lib/resolve-table-capacity';

export async function GET(request: NextRequest) {
  try {
    const client = await pool.connect();
    
    try {
      // テーブル一覧を取得
      const result = await client.query(
        'SELECT id, name, capacity, other, created_at FROM "table" ORDER BY created_at ASC, id ASC'
      );

      return NextResponse.json({
        success: true,
        tables: result.rows
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('テーブル一覧取得エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました。' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, capacity, other } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'テーブル名を入力してください。' },
        { status: 400 }
      );
    }

    const cap = resolveCapacityInput(capacity);
    if (!cap.ok) {
      return NextResponse.json({ error: cap.error }, { status: 400 });
    }

    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'INSERT INTO "table" (name, capacity, other) VALUES ($1, $2, $3) RETURNING id, name, capacity, other, created_at',
        [name, cap.value, other || '']
      );

      return NextResponse.json({
        success: true,
        message: 'テーブルが正常に追加されました',
        data: result.rows[0]
      });

    } catch (error: any) {
      if (error.code === '23505') { // 一意制約違反
        return NextResponse.json(
          { error: 'このテーブル名は既に使用されています。' },
          { status: 409 }
        );
      }
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('テーブル追加エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました。' },
      { status: 500 }
    );
  }
}
