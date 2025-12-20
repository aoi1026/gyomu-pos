import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // e.g. pending / approved / rejected / saved

    const client = await pool.connect();
    
    try {
      // 勤怠データ一覧を取得
      const params: any[] = [];
      const where = status ? `WHERE a.status = $1` : '';
      if (status) params.push(status);

      const result = await client.query(`
        SELECT 
          a.*,
          u.name as staff_name,
          u.mail as staff_email
        FROM attendance a
        JOIN "user" u ON a.staff_id = u.id
        ${where}
        ORDER BY a.created_at DESC
      `, params);

      return NextResponse.json({
        success: true,
        data: result.rows
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('勤怠データ取得エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました。' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { staff_id, clock_in, clock_out, total_work_hours, comment, detailed_times } = await request.json();

    if (!staff_id || !clock_in) {
      return NextResponse.json(
        { error: 'スタッフIDと出勤時間は必須です。' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'INSERT INTO attendance (staff_id, clock_in, clock_out, total_work_hours, comment, detailed_times) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [staff_id, clock_in, clock_out, total_work_hours, comment, JSON.stringify(detailed_times)]
      );

      return NextResponse.json({
        success: true,
        message: '勤怠データが正常に保存されました',
        data: result.rows[0]
      });

    } catch (error: any) {
      console.error('勤怠データ保存エラー:', error);
      return NextResponse.json(
        { error: '勤怠データの保存に失敗しました。' },
        { status: 500 }
      );
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('勤怠データ保存エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました。' },
      { status: 500 }
    );
  }
}
