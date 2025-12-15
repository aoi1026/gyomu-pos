/**
 * 毎週月曜日00:00（JST）に給与を自動更新するスクリプト
 * このスクリプトは別プロセスとして実行する必要があります
 * 一度実行すると、プロセスが常時アクティブ状態となり、毎週月曜日00:00に自動的に給与を更新します
 * 
 * 実行方法:
 * node scripts/salary-update-cron.js
 * 
 * または、pm2などのプロセスマネージャーを使用:
 * pm2 start scripts/salary-update-cron.js --name salary-update
 */

const { Pool } = require('pg');

// 環境変数からデータベース接続情報を取得
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'cabaclub_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'root',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

// PostgreSQL接続プールを作成
const pool = new Pool(dbConfig);

/**
 * 前週の出勤日数に基づいて時給を更新
 */
async function updateHourlyPrices(client) {
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

    settingsResult.rows.forEach((row) => {
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
  } catch (error) {
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
async function updateSalaryCategories(client) {
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
    const attendayMap = {};
    attendayResult.rows.forEach((row) => {
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
  } catch (error) {
    console.error('給与カテゴリ自動更新エラー:', error);
    return {
      success: false,
      message: '',
      error: error.message || '給与カテゴリの自動更新に失敗しました'
    };
  }
}

/**
 * 次回の月曜日00:00（JST）を計算
 * JST = UTC+9時間なので、月曜日00:00 JST = 日曜日15:00 UTC
 */
function getNextMondayMidnightJST() {
  const now = new Date();
  
  // 現在のUTC時刻を取得
  const utcNow = new Date(now.getTime());
  
  // 現在のUTC曜日を取得（0=日曜日, 1=月曜日, ..., 6=土曜日）
  const dayOfWeek = utcNow.getUTCDay();
  
  // 現在のUTC時刻（時:分:秒:ミリ秒）
  const currentHour = utcNow.getUTCHours();
  const currentMinute = utcNow.getUTCMinutes();
  const currentSecond = utcNow.getUTCSeconds();
  const currentMs = utcNow.getUTCMilliseconds();
  
  // 次回の日曜日15:00 UTC（= 月曜日00:00 JST）を計算
  let daysUntilSunday = 0;
  if (dayOfWeek === 0) {
    // 今日が日曜日の場合
    if (currentHour < 15 || (currentHour === 15 && currentMinute === 0 && currentSecond === 0 && currentMs === 0)) {
      // まだ15:00に達していない場合、今日の15:00
      daysUntilSunday = 0;
    } else {
      // すでに15:00を過ぎている場合、次の日曜日（7日後）
      daysUntilSunday = 7;
    }
  } else {
    // その他の場合、次の日曜日までの日数
    daysUntilSunday = 7 - dayOfWeek;
  }
  
  // 次回の日曜日15:00 UTCを計算
  const nextSunday = new Date(utcNow);
  nextSunday.setUTCDate(utcNow.getUTCDate() + daysUntilSunday);
  nextSunday.setUTCHours(15, 0, 0, 0); // 日曜日15:00 UTC = 月曜日00:00 JST
  
  return nextSunday;
}

/**
 * 給与更新を実行
 */
async function runSalaryUpdate() {
  const client = await pool.connect();
  const results = {
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
  } catch (error) {
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

/**
 * 次回の実行時刻まで待機してから給与更新を実行
 */
function scheduleNextUpdate() {
  const nextMonday = getNextMondayMidnightJST();
  const now = new Date();
  const msUntilNextMonday = nextMonday.getTime() - now.getTime();
  
  // 次回実行時刻を表示
  const nextMondayJST = new Date(nextMonday.getTime() + (9 * 60 * 60 * 1000));
  console.log(`[${now.toISOString()}] 次回の給与更新は ${nextMondayJST.toISOString().replace('T', ' ').substring(0, 19)} JST に実行されます。`);
  console.log(`[${now.toISOString()}] 待機時間: ${Math.floor(msUntilNextMonday / (1000 * 60 * 60))}時間 ${Math.floor((msUntilNextMonday % (1000 * 60 * 60)) / (1000 * 60))}分`);
  
  setTimeout(async () => {
    await runSalaryUpdate();
    // 実行後、次の月曜日をスケジュール
    scheduleNextUpdate();
  }, msUntilNextMonday);
}

// スクリプトが直接実行された場合
if (require.main === module) {
  console.log('給与更新スクリプトが開始されました。毎週月曜日00:00（JST）に給与を更新します。');
  
  // 初回実行（オプション：コメントアウトを解除すると、起動時に即座に実行）
  // runSalaryUpdate();
  
  // 次回の月曜日00:00（JST）まで待機してから実行
  scheduleNextUpdate();
  
  // プロセスを終了させない
  process.on('SIGINT', () => {
    console.log(`\n[${new Date().toISOString()}] 給与更新スクリプトを終了します...`);
    pool.end()
      .then(() => {
        console.log('データベース接続を閉じました。');
        process.exit(0);
      })
      .catch((error) => {
        console.error('データベース接続のクローズに失敗しました:', error);
        process.exit(1);
      });
  });
  
  process.on('SIGTERM', () => {
    console.log(`\n[${new Date().toISOString()}] 給与更新スクリプトを終了します...`);
    pool.end()
      .then(() => {
        console.log('データベース接続を閉じました。');
        process.exit(0);
      })
      .catch((error) => {
        console.error('データベース接続のクローズに失敗しました:', error);
        process.exit(1);
      });
  });
}

// モジュールとしてエクスポート（テスト用）
module.exports = {
  runSalaryUpdate,
  updateHourlyPrices,
  updateSalaryCategories
};

