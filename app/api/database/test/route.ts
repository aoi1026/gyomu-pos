import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const client = await pool.connect();
    
    try {
      // データベース接続テスト
      const result = await client.query('SELECT NOW() as current_time');
      
      // attendanceテーブルの存在確認
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'attendance'
        ) as table_exists
      `);
      
      return NextResponse.json({
        success: true,
        message: 'データベース接続成功',
        current_time: result.rows[0].current_time,
        attendance_table_exists: tableCheck.rows[0].table_exists
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('データベース接続エラー:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'データベース接続に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}