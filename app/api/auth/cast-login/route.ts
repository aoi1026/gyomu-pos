import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';
import { verifyPassword } from '@/lib/hash';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'メールアドレスとパスワードを入力してください。' },
        { status: 400 }
      );
    }

    // データベースからキャストユーザーを検索
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT id, name, mail, password, role, bottle_back, drink_back, main_nomination, inside_nomination FROM "user" WHERE mail = $1 AND role = $2',
        [email, 'cast']
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'キャストアカウントが見つかりません。' },
          { status: 401 }
        );
      }

      const user = result.rows[0];

      // パスワードの検証（MD5ハッシュ化を使用）
      if (!verifyPassword(password, user.password)) {
        return NextResponse.json(
          { error: 'パスワードが正しくありません。' },
          { status: 401 }
        );
      }

      // 認証成功
      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.mail,
          role: user.role,
          bottle_back: user.bottle_back,
          drink_back: user.drink_back,
          main_nomination: user.main_nomination,
          inside_nomination: user.inside_nomination
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('キャストログインエラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました。' },
      { status: 500 }
    );
  }
}
