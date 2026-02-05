import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { name, mail, password, other, gender } = await request.json();
    const tableUserId = params.id;

    if (!name || !mail) {
      return NextResponse.json(
        { error: '名前とメールアドレスを入力してください。' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      // genderカラムが存在するか確認し、存在しない場合は追加
      await client.query(`
        ALTER TABLE "user" ADD COLUMN IF NOT EXISTS gender VARCHAR(10)
      `);

      let query: string, values: any[];
      
      if (password) {
        const { hashPassword } = await import('@/lib/hash');
        const hashedPassword = hashPassword(password);
        
        query = 'UPDATE "user" SET name = $1, mail = $2, password = $3, other = $4, gender = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 AND role = $7 RETURNING id, name, mail, other, gender, created_at';
        values = [name, mail, hashedPassword, other || '', gender || null, tableUserId, 'table'];
      } else {
        query = 'UPDATE "user" SET name = $1, mail = $2, other = $3, gender = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 AND role = $6 RETURNING id, name, mail, other, gender, created_at';
        values = [name, mail, other || '', gender || null, tableUserId, 'table'];
      }

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'テーブル管理ユーザーが見つかりません。' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'テーブル管理ユーザー情報が正常に更新されました',
        data: result.rows[0]
      });

    } catch (error: any) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'このメールアドレスは既に使用されています。' },
          { status: 409 }
        );
      }
      console.error('テーブル管理ユーザー更新エラー:', error);
      return NextResponse.json(
        { error: '更新に失敗しました。' },
        { status: 500 }
      );
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('テーブル管理ユーザー更新リクエスト処理エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました。' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tableUserId = params.id;
    const client = await pool.connect();

    try {
      const result = await client.query(
        'DELETE FROM "user" WHERE id = $1 AND role = $2 RETURNING id, name',
        [tableUserId, 'table']
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'テーブル管理ユーザーが見つかりません。' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'テーブル管理ユーザーが正常に削除されました',
        data: result.rows[0]
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('テーブル管理ユーザー削除エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました。' },
      { status: 500 }
    );
  }
}
