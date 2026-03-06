import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

// 前週の出勤日数に基づいてsalary_categoryを自動更新
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    // 前週の開始日と終了日を計算（7日間）
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastWeekEnd = new Date(today);
    lastWeekEnd.setDate(today.getDate() - 1); // 昨日
    const lastWeekStart = new Date(lastWeekEnd);
    lastWeekStart.setDate(lastWeekEnd.getDate() - 6); // 7日前

    // 前週の出勤日数を各キャストごとに取得
    const attendanceResult = await client.query(
      `SELECT staff_id, COUNT(DISTINCT DATE(clock_in)) as attendance_days
       FROM attendance
       WHERE clock_in >= $1 
         AND clock_in < $2
         AND status = 'saved'
       GROUP BY staff_id`,
      [lastWeekStart.toISOString(), new Date(lastWeekEnd.getTime() + 24 * 60 * 60 * 1000).toISOString()]
    );

    // salary_attendayテーブルからカテゴリごとの出勤日数別金額を取得
    const attendayResult = await client.query(
      'SELECT category_id, attenday_number, value FROM salary_attenday ORDER BY category_id, attenday_number'
    );

    // カテゴリごとにグループ化
    const attendayByCategory: { [key: number]: { [key: number]: number } } = {};
    attendayResult.rows.forEach((row: any) => {
      if (!attendayByCategory[row.category_id]) {
        attendayByCategory[row.category_id] = {};
      }
      attendayByCategory[row.category_id][row.attenday_number] = parseFloat(row.value);
    });

    // 各キャストの各カテゴリについて、出勤日数に応じた金額を設定
    let updateCount = 0;
    for (const attendanceRow of attendanceResult.rows) {
      const castId = attendanceRow.staff_id;
      const attendanceDays = parseInt(attendanceRow.attendance_days) || 0;

      // 各カテゴリについて処理
      for (const categoryIdStr in attendayByCategory) {
        const categoryId = parseInt(categoryIdStr);
        const attendayMap = attendayByCategory[categoryId];

        // 出勤日数に該当する金額を取得（該当する日数がない場合は0）
        let value = 0;
        if (attendayMap[attendanceDays]) {
          value = attendayMap[attendanceDays];
        }

        // salary_categoryテーブルに保存
        await client.query(
          `INSERT INTO salary_category (cast_id, category_id, value)
           VALUES ($1, $2, $3)
           ON CONFLICT (cast_id, category_id) DO UPDATE
           SET value = $3, updated_at = CURRENT_TIMESTAMP`,
          [castId, categoryId, value]
        );
        updateCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `${updateCount}件の設定を更新しました` 
    });
  } catch (error) {
    console.error('給与カテゴリ自動更新エラー:', error);
    return NextResponse.json(
      { success: false, error: '給与カテゴリの自動更新に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

