import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const client = await pool.connect();
    
    try {
      // attendanceテーブルを作成
      await client.query(`
        CREATE TABLE IF NOT EXISTS attendance (
          id SERIAL PRIMARY KEY,
          staff_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
          clock_in TIMESTAMP WITH TIME ZONE NOT NULL,
          clock_out TIMESTAMP WITH TIME ZONE,
          total_work_hours DECIMAL(5,2),
          comment TEXT,
          detailed_times JSONB,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'saved')),
          approved_by INTEGER REFERENCES "user"(id),
          approved_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // インデックスを作成
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_attendance_staff_id ON attendance(staff_id)
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status)
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_attendance_clock_in ON attendance(clock_in)
      `);

      // トリガー関数が存在するかチェック
      const triggerFunctionExists = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_proc 
          WHERE proname = 'update_updated_at_column'
        ) as function_exists
      `);

      if (!triggerFunctionExists.rows[0].function_exists) {
        // トリガー関数を作成
        await client.query(`
          CREATE OR REPLACE FUNCTION update_updated_at_column()
          RETURNS TRIGGER AS $$
          BEGIN
              NEW.updated_at = CURRENT_TIMESTAMP;
              RETURN NEW;
          END;
          $$ language 'plpgsql'
        `);
      }

      // トリガーを作成
      await client.query(`
        DROP TRIGGER IF EXISTS update_attendance_updated_at ON attendance
      `);
      
      await client.query(`
        CREATE TRIGGER update_attendance_updated_at 
          BEFORE UPDATE ON attendance 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `);

      return NextResponse.json({
        success: true,
        message: 'attendanceテーブルが正常に作成されました'
      });

    } catch (error: any) {
      console.error('テーブル作成エラー:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'テーブル作成に失敗しました',
          details: error.message
        },
        { status: 500 }
      );
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
