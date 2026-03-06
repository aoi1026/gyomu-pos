import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { pool } from '@/lib/database';

export async function GET() {
  const client = await pool.connect();
  try {
    // salesorderテーブルの制約を確認
    const result = await client.query(`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint 
      WHERE conrelid = 'salesorder'::regclass
      AND contype = 'c';
    `);

    return NextResponse.json({
      success: true,
      constraints: result.rows
    });
  } catch (error) {
    console.error('制約確認エラー:', error);
    return NextResponse.json(
      { success: false, error: '制約の確認に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
