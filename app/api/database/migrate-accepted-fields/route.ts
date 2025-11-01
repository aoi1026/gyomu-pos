import { NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function POST() {
  const client = await pool.connect();
  try {
    // accepted_atカラムを追加
    await client.query(`
      ALTER TABLE salesorder ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE;
    `);

    // accepted_byカラムを追加
    await client.query(`
      ALTER TABLE salesorder ADD COLUMN IF NOT EXISTS accepted_by INTEGER REFERENCES "user"(id);
    `);

    // インデックスを追加
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_salesorder_accepted_at ON salesorder(accepted_at);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_salesorder_accepted_by ON salesorder(accepted_by);
    `);

    return NextResponse.json({
      success: true,
      message: 'accepted_atとaccepted_byカラムが正常に追加されました'
    });
  } catch (error) {
    console.error('マイグレーションエラー:', error);
    return NextResponse.json(
      { success: false, error: 'マイグレーションに失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
