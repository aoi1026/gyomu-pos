import { NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function POST() {
  const client = await pool.connect();
  try {
    // 既存の制約を削除
    await client.query(`
      ALTER TABLE salesorder DROP CONSTRAINT IF EXISTS salesorder_status_check;
    `);

    // 正しい制約を追加
    await client.query(`
      ALTER TABLE salesorder ADD CONSTRAINT salesorder_status_check 
      CHECK (status IN ('pending', 'accepted', 'rejected', 'completed'));
    `);

    return NextResponse.json({
      success: true,
      message: 'status制約が正常に修正されました'
    });
  } catch (error) {
    console.error('制約修正エラー:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '制約の修正に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
