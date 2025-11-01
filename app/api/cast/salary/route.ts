import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { pool } from '@/lib/database';

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const userId = Number(searchParams.get('user_id'));
    const year = Number(searchParams.get('year'));
    const month = Number(searchParams.get('month'));

    if (!userId || !year || !month || month < 1 || month > 12) {
      return NextResponse.json({ success: false, error: 'user_id, year, month are required' }, { status: 400 });
    }

    const result = await client.query(
      `SELECT * FROM salary WHERE user_id = $1 AND year = $2 AND month = $3`,
      [userId, year, month]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          user_id: userId,
          year,
          month,
          basic_hours: 0,
          base_pay: 0,
          main_nomination_count: 0,
          main_nomination_fee: 0,
          inside_nomination_count: 0,
          inside_nomination_fee: 0,
          bottle_back_yen: 0,
          drink_back_yen: 0,
          overtime_wage_yen: 0,
          deduction_yen: 0,
          total_pay_yen: 0
        }
      });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('キャスト給与取得エラー:', error);
    return NextResponse.json({ success: false, error: '給与情報の取得に失敗しました' }, { status: 500 });
  } finally {
    client.release();
  }
}


