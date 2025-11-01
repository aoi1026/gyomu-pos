import { NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function GET() {
  const client = await pool.connect();
  try {
    // salesorderテーブルの構造を確認
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'salesorder' 
      ORDER BY ordinal_position;
    `);

    return NextResponse.json({
      success: true,
      columns: result.rows
    });
  } catch (error) {
    console.error('テーブル構造確認エラー:', error);
    return NextResponse.json(
      { success: false, error: 'テーブル構造の確認に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
