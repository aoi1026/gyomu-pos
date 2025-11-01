import { NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function GET() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT id, name, mail
      FROM "user"
      WHERE role = 'cast'
      ORDER BY name ASC
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