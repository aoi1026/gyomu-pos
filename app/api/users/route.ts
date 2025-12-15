import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

// Avoid static optimization so DB is not hit at build time
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

// 全ユーザーを取得
export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    let query = `SELECT id, name, mail, role FROM "user"`;
    const params: any[] = [];

    if (role) {
      query += ` WHERE role = $1`;
      params.push(role);
    }

    query += ` ORDER BY id ASC`;

    const result = await client.query(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('ユーザー取得エラー:', error);
    return NextResponse.json(
      { success: false, error: 'ユーザーの取得に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

