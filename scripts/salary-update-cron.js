/**
 * 毎週月曜日「システム日付変更時刻（JST）」に給与を自動更新するスクリプト
 *
 * このスクリプトは別プロセスとして実行する必要があります。一度起動すると常時アクティブと
 * なり、毎週月曜日のシステム日付変更時刻（project_variable テーブルの `system_time` に
 * 設定された HH:MM の JST 時刻）に自動的に給与を更新します。値が未設定または不正な場合は
 * フォールバックとして 06:00 JST を採用します。
 *
 * 実行方法:
 * node scripts/salary-update-cron.js
 *
 * または、pm2などのプロセスマネージャーを使用:
 * pm2 start scripts/salary-update-cron.js --name salary-update
 */

// system_time が未設定／不正値のときに使うフォールバック時刻
const SYSTEM_TIME_FALLBACK_HH = 6;
const SYSTEM_TIME_FALLBACK_MM = 0;

// system_time の変更検知間隔（ミリ秒）
const SYSTEM_TIME_POLL_INTERVAL_MS = 5 * 60 * 1000;

const { Pool } = require('pg');

// 環境変数からデータベース接続情報を取得
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'cabaclub_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
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
 * project_variable テーブルからシステム日付変更時刻 (HH:MM, JST) を取得する。
 * 値が未設定／不正な場合はフォールバック値 (06:00) を返す。
 */
async function getSystemTimeHHMM() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT value FROM project_variable WHERE name = 'system_time' LIMIT 1`
    );
    const raw = result.rows[0] ? String(result.rows[0].value || '').trim() : '';
    const m = /^(\d{1,2}):(\d{2})$/.exec(raw);
    if (!m) {
      return { hh: SYSTEM_TIME_FALLBACK_HH, mm: SYSTEM_TIME_FALLBACK_MM };
    }
    const hh = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    if (
      Number.isNaN(hh) || Number.isNaN(mm) ||
      hh < 0 || hh > 23 || mm < 0 || mm > 59
    ) {
      return { hh: SYSTEM_TIME_FALLBACK_HH, mm: SYSTEM_TIME_FALLBACK_MM };
    }
    return { hh, mm };
  } catch (err) {
    console.error(`[${new Date().toISOString()}] system_time 取得エラー:`, err);
    return { hh: SYSTEM_TIME_FALLBACK_HH, mm: SYSTEM_TIME_FALLBACK_MM };
  } finally {
    client.release();
  }
}

/**
 * 与えられた `Date` の JST 壁時計（年・月・日・時・分・曜日）を取得する内部ヘルパー。
 * 曜日は 0=日曜 〜 6=土曜。
 */
function getJstWallclock(at) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(at);
  const get = (type) => {
    const found = parts.find((p) => p.type === type);
    return found ? found.value : '';
  };
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10),
    day: parseInt(get('day'), 10),
    hour: parseInt(get('hour'), 10) % 24,
    minute: parseInt(get('minute'), 10),
    second: parseInt(get('second'), 10),
    weekday: weekdayMap[get('weekday')] !== undefined ? weekdayMap[get('weekday')] : 0,
  };
}

/**
 * 次回の月曜日 hh:mm（JST）の UTC `Date` を計算
 * JST = UTC+9
 */
function getNextMondayAtJST(hh, mm) {
  const now = new Date();
  const jst = getJstWallclock(now);

  // 月曜日(=1) までの日数を計算
  let daysUntilMonday = (1 - jst.weekday + 7) % 7;
  if (daysUntilMonday === 0) {
    // 今日がすでに月曜日。目標時刻を過ぎている場合は次週へ。
    const targetMinutes = hh * 60 + mm;
    const nowMinutes = jst.hour * 60 + jst.minute;
    if (nowMinutes >= targetMinutes) {
      daysUntilMonday = 7;
    }
  }

  // 目標となる JST 暦日 (YYYY-MM-DD) を求める
  const targetDate = new Date(Date.UTC(jst.year, jst.month - 1, jst.day));
  targetDate.setUTCDate(targetDate.getUTCDate() + daysUntilMonday);
  const ty = targetDate.getUTCFullYear();
  const tm = targetDate.getUTCMonth();
  const td = targetDate.getUTCDate();

  // 目標 JST 壁時計 → UTC instant
  // 月曜 hh:mm JST = 同日 (hh-9):mm UTC（負値は Date.UTC が前日へ正規化）
  return new Date(Date.UTC(ty, tm, td, hh - 9, mm, 0, 0));
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

/** 現在スケジュール中の setTimeout id（再スケジュール時にクリアするため） */
let scheduledTimeoutId = null;
/** 現在スケジュール中の発火時刻（UTC ms） */
let scheduledTargetMs = null;
/** 直近に観測した system_time（hh*60+mm）。変更検知用 */
let lastObservedSystemMinutes = null;

/**
 * project_variable の system_time を読み込み、次回の月曜日システム日時変更時刻まで
 * 待機してから給与更新を実行する。既存のスケジュールがあればキャンセルして上書きする。
 */
async function scheduleNextUpdate() {
  if (scheduledTimeoutId) {
    clearTimeout(scheduledTimeoutId);
    scheduledTimeoutId = null;
  }

  const { hh, mm } = await getSystemTimeHHMM();
  lastObservedSystemMinutes = hh * 60 + mm;

  const nextMonday = getNextMondayAtJST(hh, mm);
  scheduledTargetMs = nextMonday.getTime();
  const now = new Date();
  const msUntilNextMonday = Math.max(scheduledTargetMs - now.getTime(), 1000);

  const targetJstStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  const nextMondayJstWall = new Date(nextMonday.getTime() + 9 * 60 * 60 * 1000);
  const nextMondayJstStr = nextMondayJstWall
    .toISOString()
    .replace('T', ' ')
    .substring(0, 19);
  console.log(
    `[${now.toISOString()}] 次回の給与更新は ${nextMondayJstStr} JST (毎週月曜日 ${targetJstStr} JST) に実行されます。`
  );
  console.log(
    `[${now.toISOString()}] 待機時間: ${Math.floor(msUntilNextMonday / (1000 * 60 * 60))}時間 ${Math.floor(
      (msUntilNextMonday % (1000 * 60 * 60)) / (1000 * 60)
    )}分`
  );

  scheduledTimeoutId = setTimeout(async () => {
    scheduledTimeoutId = null;
    scheduledTargetMs = null;
    await runSalaryUpdate();
    // 実行後、次の月曜日を再スケジュール（その時点の system_time を再読込）
    scheduleNextUpdate();
  }, msUntilNextMonday);
}

/**
 * system_time が変更された場合に検知して再スケジュールする。
 * 管理者ダッシュボードから時刻が変更されても、次回実行を最新値で待ち合わせるための仕組み。
 */
async function pollSystemTimeChange() {
  try {
    const { hh, mm } = await getSystemTimeHHMM();
    const currentMinutes = hh * 60 + mm;
    if (
      lastObservedSystemMinutes !== null &&
      currentMinutes !== lastObservedSystemMinutes &&
      scheduledTimeoutId !== null
    ) {
      console.log(
        `[${new Date().toISOString()}] system_time が変更されました ` +
          `(${String(Math.floor(lastObservedSystemMinutes / 60)).padStart(2, '0')}:${String(
            lastObservedSystemMinutes % 60
          ).padStart(2, '0')} → ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')})。` +
          `スケジュールを更新します。`
      );
      await scheduleNextUpdate();
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] system_time 変更検知エラー:`, err);
  }
}

// スクリプトが直接実行された場合
if (require.main === module) {
  console.log(
    '給与更新スクリプトが開始されました。毎週月曜日のシステム日付変更時刻（project_variable.system_time、JST）に給与を更新します。'
  );

  // 初回実行（オプション：コメントアウトを解除すると、起動時に即座に実行）
  // runSalaryUpdate();

  // 次回の月曜日システム日付変更時刻（JST）まで待機してから実行
  scheduleNextUpdate();

  // system_time の変更検知ポーリング
  const pollIntervalId = setInterval(pollSystemTimeChange, SYSTEM_TIME_POLL_INTERVAL_MS);

  const shutdown = (signal) => {
    console.log(`\n[${new Date().toISOString()}] 給与更新スクリプトを終了します... (${signal})`);
    clearInterval(pollIntervalId);
    if (scheduledTimeoutId) {
      clearTimeout(scheduledTimeoutId);
      scheduledTimeoutId = null;
    }
    pool
      .end()
      .then(() => {
        console.log('データベース接続を閉じました。');
        process.exit(0);
      })
      .catch((error) => {
        console.error('データベース接続のクローズに失敗しました:', error);
        process.exit(1);
      });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// モジュールとしてエクスポート（テスト用）
module.exports = {
  runSalaryUpdate,
  updateHourlyPrices,
  updateSalaryCategories,
  getSystemTimeHHMM,
  getNextMondayAtJST,
};

