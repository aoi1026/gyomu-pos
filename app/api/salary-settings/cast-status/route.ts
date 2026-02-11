import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

// すべてのキャストの前週の出勤日数と時給情報を取得
export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    // 前週の開始日と終了日を計算（月曜日～日曜日）
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // 前週の日曜日を取得（今日が日曜なら7日前、それ以外は dayOfWeek 日前＝直近の日曜）
    const dayOfWeek = today.getDay(); // 0 = 日曜日, 1 = 月曜日, ..., 6 = 土曜日
    const lastWeekSunday = new Date(today);
    lastWeekSunday.setDate(today.getDate() - (dayOfWeek === 0 ? 7 : dayOfWeek));
    
    // 前週の月曜日を取得
    const lastWeekMonday = new Date(lastWeekSunday);
    lastWeekMonday.setDate(lastWeekSunday.getDate() - 6); // 7日前（月曜日）
    
    // 前週の範囲（月曜日 00:00:00 ～ 日曜日 23:59:59）
    const weekStart = new Date(lastWeekMonday);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(lastWeekSunday);
    weekEnd.setHours(23, 59, 59, 999);

    // すべてのキャスト（role = 'cast'）を取得
    const usersResult = await client.query(
      `SELECT id, name, hourly_price, role
       FROM "user"
       WHERE role = 'cast'
       ORDER BY name`
    );

    // 前週の出勤日数を各キャストごとに取得
    const attendanceResult = await client.query(
      `SELECT staff_id, COUNT(DISTINCT DATE(clock_in)) as attendance_days
       FROM attendance
       WHERE clock_in >= $1 
         AND clock_in <= $2
         AND status = 'saved'
       GROUP BY staff_id`,
      [weekStart.toISOString(), weekEnd.toISOString()]
    );

    // 出勤日数をマップに変換
    const attendanceMap: { [key: number]: number } = {};
    attendanceResult.rows.forEach((row: any) => {
      attendanceMap[row.staff_id] = parseInt(row.attendance_days) || 0;
    });

    // 基準日と時給設定を取得
    const settingsResult = await client.query(
      `SELECT charge_name, value FROM add_charges 
       WHERE charge_name IN ('standard_date', 'regular', 'arubaito')`
    );

    let standardDate = 1;
    let regularWage = 0;
    let arubaitoWage = 0;

    settingsResult.rows.forEach((row: any) => {
      if (row.charge_name === 'standard_date') {
        standardDate = parseInt(row.value) || 1;
      } else if (row.charge_name === 'regular') {
        regularWage = parseFloat(row.value) || 0;
      } else if (row.charge_name === 'arubaito') {
        arubaitoWage = parseFloat(row.value) || 0;
      }
    });

    // キャスト情報と出勤日数、時給情報を結合
    const castStatus = usersResult.rows.map((user: any) => {
      const attendanceDays = attendanceMap[user.id] || 0;
      const hourlyPrice = parseFloat(user.hourly_price) || 0;
      const wageType = attendanceDays >= standardDate ? 'regular' : 'arubaito';
      const expectedWage = attendanceDays >= standardDate ? regularWage : arubaitoWage;

      return {
        id: user.id,
        name: user.name,
        attendanceDays,
        hourlyPrice,
        wageType,
        expectedWage,
        standardDate,
        regularWage,
        arubaitoWage,
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0]
      };
    });

    return NextResponse.json({
      success: true,
      data: castStatus,
      weekInfo: {
        start: weekStart.toISOString().split('T')[0],
        end: weekEnd.toISOString().split('T')[0],
        standardDate,
        regularWage,
        arubaitoWage
      }
    });
  } catch (error) {
    console.error('キャスト給与状態取得エラー:', error);
    return NextResponse.json(
      { success: false, error: 'キャスト給与状態の取得に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
