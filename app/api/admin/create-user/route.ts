import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';
import { hashPassword } from '@/lib/hash';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, role = 'admin' } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: '名前、メールアドレス、パスワードを入力してください。' },
        { status: 400 }
      );
    }

    // パスワードをMD5ハッシュ化
    const hashedPassword = hashPassword(password);

    // データベースにユーザーを作成
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'INSERT INTO "user" (name, mail, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, mail, role',
        [name, email, hashedPassword, role]
      );

      const user = result.rows[0];

      return NextResponse.json({
        success: true,
        message: 'ユーザーが正常に作成されました',
        user: {
          id: user.id,
          name: user.name,
          email: user.mail,
          role: user.role
        }
      });

    } catch (error: any) {
      if (error.code === '23505') { // 一意制約違反
        return NextResponse.json(
          { error: 'このメールアドレスは既に使用されています。' },
          { status: 409 }
        );
      }
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('ユーザー作成エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました。' },
      { status: 500 }
    );
  }
}
