import { NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function POST() {
  const client = await pool.connect();
  try {
    // 既存の外部キー制約を削除
    await client.query(`
      ALTER TABLE serviceorder DROP CONSTRAINT IF EXISTS serviceorder_service_id_fkey;
    `);

    // 正しい外部キー制約を追加
    await client.query(`
      ALTER TABLE serviceorder ADD CONSTRAINT serviceorder_service_id_fkey 
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE;
    `);

    return NextResponse.json({
      success: true,
      message: 'serviceorderテーブルの外部キー制約が正常に修正されました'
    });
  } catch (error) {
    console.error('外部キー制約修正エラー:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '外部キー制約の修正に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
