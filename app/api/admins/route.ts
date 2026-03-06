import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';
import { hashPassword } from '@/lib/hash';

// Avoid static optimization so DB is not hit at build time
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

// 管理者一覧を取得
export async function GET() {
  const client = await pool.connect();
  try {
    // genderカラムが存在するか確認し、存在しない場合は追加
    await client.query(`
      ALTER TABLE "user" ADD COLUMN IF NOT EXISTS gender VARCHAR(10)
    `);

    const result = await client.query(
      `SELECT id, name, mail, other, gender, created_at
       FROM "user"
       WHERE role = $1
       ORDER BY id ASC`,
      ['admin']
    );

    return NextResponse.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('管理者データ取得エラー:', error);
    return NextResponse.json(
      { success: false, error: '管理者データの取得に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// 管理者を作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = body?.name;
    const mail = body?.mail ?? body?.email; // 互換: emailでも受ける
    const password = body?.password;
    const other = body?.other ?? '';
    const gender = body?.gender;

    if (!name || !mail || !password) {
      return NextResponse.json(
        { success: false, error: '管理者名、管理者メール、パスワードを入力してください。' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      const hashedPassword = hashPassword(password);

      // genderカラムが存在するか確認し、存在しない場合は追加
      await client.query(`
        ALTER TABLE "user" ADD COLUMN IF NOT EXISTS gender VARCHAR(10)
      `);

      const result = await client.query(
        'INSERT INTO "user" (name, mail, password, other, gender, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, mail, other, gender, created_at',
        [name, mail, hashedPassword, other, gender || null, 'admin']
      );

      return NextResponse.json({
        success: true,
        message: '管理者が正常に追加されました',
        data: result.rows[0]
      });
    } catch (error: any) {
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'このメールアドレスは既に使用されています。' },
          { status: 409 }
        );
      }
      console.error('管理者追加エラー:', error);
      return NextResponse.json(
        { success: false, error: 'サーバーエラーが発生しました' },
        { status: 500 }
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('管理者追加エラー(リクエスト解析):', error);
    return NextResponse.json(
      { success: false, error: '不正なリクエストです。' },
      { status: 400 }
    );
  }
}


