import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { pool } from '@/lib/database';
import { hashPassword } from '@/lib/hash';

export async function GET() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT id, name, mail, other, created_at
      FROM "user"
      WHERE role = 'cast'
      // ORDER BY id DESC
      ORDER BY id ASC
    `);
    
    return NextResponse.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('キャストデータ取得エラー:', error);
    return NextResponse.json(
      { success: false, error: 'キャストデータの取得に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, mail, password, other } = await request.json();

    if (!name || !mail || !password) {
      return NextResponse.json(
        { success: false, error: '名前、メールアドレス、パスワードを入力してください。' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      const hashedPassword = hashPassword(password);

      const result = await client.query(
        'INSERT INTO "user" (name, mail, password, other, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, mail, other, created_at',
        [name, mail, hashedPassword, other || '', 'cast']
      );

      return NextResponse.json({
        success: true,
        message: 'キャストが正常に追加されました',
        data: result.rows[0]
      });
    } catch (error: any) {
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'このメールアドレスは既に使用されています。' },
          { status: 409 }
        );
      }
      console.error('キャスト追加エラー:', error);
      return NextResponse.json(
        { success: false, error: 'サーバーエラーが発生しました。' },
        { status: 500 }
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('キャスト追加エラー(リクエスト解析):', error);
    return NextResponse.json(
      { success: false, error: '不正なリクエストです。' },
      { status: 400 }
    );
  }
}