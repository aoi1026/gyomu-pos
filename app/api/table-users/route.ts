import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';
import { hashPassword } from '@/lib/hash';

// Avoid static optimization so DB is not hit at build time
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

// テーブル管理ユーザー一覧を取得
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
      ['table']
    );

    return NextResponse.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('テーブル管理ユーザーデータ取得エラー:', error);
    return NextResponse.json(
      { success: false, error: 'テーブル管理ユーザーデータの取得に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// テーブル管理ユーザーを作成
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
        { success: false, error: '名前、メールアドレス、パスワードを入力してください。' },
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

      // roleカラムのCHECK制約に'table'を追加（存在しない場合）
      // 既存のCHECK制約を削除（エラーが発生しても無視）
      try {
        await client.query(`ALTER TABLE "user" DROP CONSTRAINT IF EXISTS user_role_check;`);
      } catch (e) {
        // 制約が存在しない場合は無視
      }
      
      // 新しいCHECK制約を追加（'table'を含む）
      try {
        await client.query(`
          ALTER TABLE "user" ADD CONSTRAINT user_role_check 
          CHECK (role IN ('admin', 'cast', 'manager', 'super_admin', 'table'))
        `);
      } catch (e: any) {
        // 制約が既に存在する場合は無視（エラーコード23503または42710）
        if (e.code !== '42710' && e.code !== '23503') {
          throw e;
        }
      }

      const result = await client.query(
        'INSERT INTO "user" (name, mail, password, other, gender, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, mail, other, gender, created_at',
        [name, mail, hashedPassword, other, gender || null, 'table']
      );

      return NextResponse.json({
        success: true,
        message: 'テーブル管理ユーザーが正常に追加されました',
        data: result.rows[0]
      });
    } catch (error: any) {
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'このメールアドレスは既に使用されています。' },
          { status: 409 }
        );
      }
      console.error('テーブル管理ユーザー追加エラー:', error);
      console.error('エラー詳細:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        stack: error.stack
      });
      return NextResponse.json(
        { 
          success: false, 
          error: 'サーバーエラーが発生しました',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      );
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('テーブル管理ユーザー追加エラー(リクエスト解析):', error);
    console.error('エラー詳細:', {
      message: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      { 
        success: false, 
        error: '不正なリクエストです。',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 400 }
    );
  }
}
