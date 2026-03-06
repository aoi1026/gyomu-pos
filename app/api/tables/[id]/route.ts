import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { name, capacity, other } = await request.json();
    const { id: tableId } = await params;

    if (!name || !capacity) {
      return NextResponse.json(
        { error: 'テーブル名と収容人数を入力してください。' },
        { status: 400 }
      );
    }

    if (capacity <= 0) {
      return NextResponse.json(
        { error: '収容人数は1以上である必要があります。' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'UPDATE "table" SET name = $1, capacity = $2, other = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING id, name, capacity, other, created_at',
        [name, capacity, other || '', tableId]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'テーブルが見つかりません。' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'テーブル情報が正常に更新されました',
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
    console.error('テーブル更新エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました。' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: tableId } = await params;
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'DELETE FROM "table" WHERE id = $1 RETURNING id, name',
        [tableId]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'テーブルが見つかりません。' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'テーブルが正常に削除されました',
        data: result.rows[0]
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('テーブル削除エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました。' },
      { status: 500 }
    );
  }
}
