/**
 * 毎週月曜日00:00に給与を自動更新するスクリプト（TypeScript版）
 * このスクリプトは別プロセスとして実行する必要があります
 * 
 * 実行方法（推奨）:
 * node scripts/salary-update-cron.js
 * 
 * TypeScript版を使用する場合:
 * npx tsx scripts/salary-update-cron.ts
 * 
 * または、pm2などのプロセスマネージャーを使用:
 * pm2 start scripts/salary-update-cron.js --name salary-update
 * 
 * cronで実行する場合（毎週月曜日00:00 JST = 日曜日15:00 UTC）:
 * 0 15 * * 0 cd /path/to/project && node scripts/salary-update-cron.js
 */

import { pool } from '../lib/database';

interface UpdateResult {
  success: boolean;
  message: string;
  error: string | null;
}

interface SalaryUpdateResults {
  hourlyUpdate: UpdateResult;
  categoryUpdate: UpdateResult;
}

/**
 * 前週の出勤日数に基づいて時給を更新
 */
async function updateHourlyPrices(client: any): Promise<UpdateResult> {
  try {
    // 前週の開始日と終了日を計算（7日間）
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastWeekEnd = new Date(today);
    lastWeekEnd.setDate(today.getDate() - 1); // 昨日
    const lastWeekStart = new Date(lastWeekEnd);
    lastWeekStart.setDate(lastWeekEnd.getDate() - 6); // 7日前

    // add_chargesテーブルから基準日と時給を取得
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

    // 各キャストの時給を更新
    let updatedCount = 0;
    for (const row of attendanceResult.rows) {
      const castId = row.staff_id;
      const attendanceDays = parseInt(row.attendance_days) || 0;
      
      // 基準日数以上ならレギュラー、未満ならアルバイト
      const hourlyPrice = attendanceDays >= standardDate ? regularWage : arubaitoWage;

      await client.query(
        `UPDATE "user" SET hourly_price = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [hourlyPrice, castId]
      );
      updatedCount++;
    }

    return {
      success: true,
      message: `${updatedCount}名のキャストの時給を更新しました`,
      error: null
    };
  } catch (error: any) {
    console.error('時給自動更新エラー:', error);
    return {
      success: false,
      message: '',
      error: error.message || '時給の自動更新に失敗しました'
    };
  }
}

/**
 * 前週の出勤日数に基づいて給与カテゴリを更新
 */
async function updateSalaryCategories(client: any): Promise<UpdateResult> {
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

    return {
      success: true,
      message: `${updatedCount}件の給与カテゴリデータを更新しました`,
      error: null
    };
  } catch (error: any) {
    console.error('給与カテゴリ自動更新エラー:', error);
    return {
      success: false,
      message: '',
      error: error.message || '給与カテゴリの自動更新に失敗しました'
    };
  }
}

/**
 * 給与更新を実行
 */
export async function runSalaryUpdate(): Promise<{ success: boolean; results: SalaryUpdateResults; error?: string }> {
  const client = await pool.connect();
  const results: SalaryUpdateResults = {
    hourlyUpdate: { success: false, message: '', error: null },
    categoryUpdate: { success: false, message: '', error: null }
  };

  try {
    console.log(`[${new Date().toISOString()}] 給与更新を開始します...`);

    // 1. 時給を更新
    console.log(`[${new Date().toISOString()}] 時給更新を開始します...`);
    results.hourlyUpdate = await updateHourlyPrices(client);
    if (results.hourlyUpdate.success) {
      console.log(`[${new Date().toISOString()}] ${results.hourlyUpdate.message}`);
    } else {
      console.error(`[${new Date().toISOString()}] 時給更新に失敗しました: ${results.hourlyUpdate.error}`);
    }

    // 2. 給与カテゴリを更新
    console.log(`[${new Date().toISOString()}] 給与カテゴリ更新を開始します...`);
    results.categoryUpdate = await updateSalaryCategories(client);
    if (results.categoryUpdate.success) {
      console.log(`[${new Date().toISOString()}] ${results.categoryUpdate.message}`);
    } else {
      console.error(`[${new Date().toISOString()}] 給与カテゴリ更新に失敗しました: ${results.categoryUpdate.error}`);
    }

    // 結果をまとめる
    const allSuccess = results.hourlyUpdate.success && results.categoryUpdate.success;
    const allFailed = !results.hourlyUpdate.success && !results.categoryUpdate.success;

    if (allSuccess) {
      console.log(`[${new Date().toISOString()}] 給与更新が完了しました。`);
    } else if (allFailed) {
      console.error(`[${new Date().toISOString()}] 給与更新に失敗しました。`);
    } else {
      console.warn(`[${new Date().toISOString()}] 給与更新が一部失敗しました。`);
    }

    return {
      success: allSuccess,
      results: results
    };
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] 給与更新エラー:`, error);
    return {
      success: false,
      error: error.message || '給与更新の実行に失敗しました',
      results: results
    };
  } finally {
    client.release();
  }
}

// スクリプトが直接実行された場合
runSalaryUpdate()
  .then((result) => {
    if (result.success) {
      console.log('給与更新が正常に完了しました。');
      process.exit(0);
    } else {
      console.error('給与更新に失敗しました。');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('予期しないエラーが発生しました:', error);
    process.exit(1);
  })
  .finally(() => {
    // 接続プールを閉じる
    pool.end()
      .then(() => {
        console.log('データベース接続を閉じました。');
      })
      .catch((error) => {
        console.error('データベース接続のクローズに失敗しました:', error);
      });
  });

