import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

// 前週の出勤日数に基づいてsalary_categoryテーブルを更新
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

    // salary_attendayテーブルから全カテゴリーの日別金額を取得
    const attendayResult = await client.query(
      `SELECT category_id, attenday_number, value
       FROM salary_attenday
       ORDER BY category_id, attenday_number`
    );

    // カテゴリーごとに日別金額をマップ
    const attendayMap: { [key: number]: { [key: number]: number } } = {};
    attendayResult.rows.forEach((row: any) => {
      const catId = row.category_id;
      const dayNum = row.attenday_number;
      const val = parseFloat(row.value) || 0;
      if (!attendayMap[catId]) {
        attendayMap[catId] = {};
      }
      attendayMap[catId][dayNum] = val;
    });

    let updatedCount = 0;

    // 各キャストの各カテゴリーについて、出勤日数に応じた金額を設定
    for (const attendanceRow of attendanceResult.rows) {
      const castId = attendanceRow.staff_id;
      const attendanceDays = parseInt(attendanceRow.attendance_days) || 0;

      // 各カテゴリーについて処理
      for (const categoryId of Object.keys(attendayMap).map(Number)) {
        const dayAmounts = attendayMap[categoryId];
        // 出勤日数に対応する金額を取得（1～7日の範囲内）
        const dayKey = Math.min(Math.max(attendanceDays, 1), 7);
        const value = dayAmounts[dayKey] || 0;

        // 既存データをチェック
        const existing = await client.query(
          'SELECT id FROM salary_category WHERE cast_id = $1 AND category_id = $2',
          [castId, categoryId]
        );

        if (existing.rows.length > 0) {
          // UPDATE
          await client.query(
            `UPDATE salary_category 
             SET value = $1, updated_at = CURRENT_TIMESTAMP
             WHERE cast_id = $2 AND category_id = $3`,
            [value, castId, categoryId]
          );
        } else {
          // INSERT
          await client.query(
            `INSERT INTO salary_category (cast_id, category_id, value)
             VALUES ($1, $2, $3)`,
            [castId, categoryId, value]
          );
        }
        updatedCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `${updatedCount}件の給与カテゴリデータを更新しました` 
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

