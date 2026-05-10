/**
 * 営業日（業務日）ユーティリティ
 *
 * このシステムは深夜営業（夜業）を前提としているため、カレンダー日付の 0:00 で
 * 日付を区切ると、深夜帯の営業情報が翌日扱いになり「出勤しているはずのキャストが
 * 出勤していない」状態になってしまう。
 *
 * そこで、システム全体の「業務日」境界を **日本時間 06:00 (Asia/Tokyo)** とする。
 *   - 業務日 YYYY-MM-DD = [YYYY-MM-DD 06:00 JST, (YYYY-MM-DD)+1 06:00 JST)
 *   - 例：2026-05-10 02:00 JST に発生したイベントは、業務日 "2026-05-09" に属する。
 *   - 例：2026-05-10 06:00 JST に発生したイベントは、業務日 "2026-05-10" に属する。
 *
 * SQL 側でも `lib/business-day-sql.ts` の式と整合する形で日付を扱うこと。
 */

export const BUSINESS_DAY_BOUNDARY_HOUR = 6;
export const BUSINESS_TIMEZONE = 'Asia/Tokyo';

/** 与えられた `Date` の JST 壁時刻を取得する内部ヘルパー。 */
function getJstWallclock(at: Date): {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10),
    day: parseInt(get('day'), 10),
    // hour: '24' は en-CA の仕様で 0:00 を意味するため正規化
    hour: parseInt(get('hour'), 10) % 24,
    minute: parseInt(get('minute'), 10),
    second: parseInt(get('second'), 10),
  };
}

/**
 * 与えられた瞬間 (デフォルト: 現在) が属する **業務日** を `YYYY-MM-DD` 形式で返す。
 * 06:00 JST より前なら前日扱いになる。
 */
export function getBusinessDayYmd(at: Date = new Date()): string {
  const w = getJstWallclock(at);
  // 業務日の基準となる JST 日付
  const utcMs = Date.UTC(w.year, w.month - 1, w.day);
  const adjusted = new Date(
    w.hour < BUSINESS_DAY_BOUNDARY_HOUR ? utcMs - 24 * 60 * 60 * 1000 : utcMs
  );
  const y = adjusted.getUTCFullYear();
  const m = String(adjusted.getUTCMonth() + 1).padStart(2, '0');
  const d = String(adjusted.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * `YYYY-MM-DD` 形式の業務日について、その営業時間帯の UTC 範囲を返す。
 *   - `start`: その業務日の 06:00 JST 相当の UTC `Date`
 *   - `endExclusive`: 翌日 06:00 JST 相当の UTC `Date`
 */
export function getBusinessDayRange(ymd: string): {
  start: Date;
  endExclusive: Date;
} {
  const [y, mo, d] = ymd.split('-').map((s) => parseInt(s, 10));
  // 06:00 JST = 21:00 UTC of previous calendar day (JST = UTC+9)
  // Date.UTC は時間部に負値を渡しても正規化される。
  const start = new Date(Date.UTC(y, mo - 1, d, BUSINESS_DAY_BOUNDARY_HOUR - 9, 0, 0, 0));
  const endExclusive = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, endExclusive };
}

/** N 日前の業務日 YYYY-MM-DD を返す。 */
export function addBusinessDays(ymd: string, days: number): string {
  const [y, mo, d] = ymd.split('-').map((s) => parseInt(s, 10));
  const base = new Date(Date.UTC(y, mo - 1, d));
  base.setUTCDate(base.getUTCDate() + days);
  return `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, '0')}-${String(base.getUTCDate()).padStart(2, '0')}`;
}

/** YYYY-MM-DD の業務日を「YYYY/MM/DD」など任意形式で表示用に整形する。 */
export function formatBusinessDay(ymd: string, locale: string = 'ja-JP'): string {
  const [y, mo, d] = ymd.split('-').map((s) => parseInt(s, 10));
  const date = new Date(Date.UTC(y, mo - 1, d));
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'UTC',
  }).format(date);
}

/**
 * 現在の業務月（YYYY-MM）。業務日の月を返す。
 * 例：5/1 03:00 JST → 業務日 4/30 → 業務月 "2026-04"
 */
export function getBusinessMonth(at: Date = new Date()): string {
  return getBusinessDayYmd(at).slice(0, 7);
}

/**
 * 業務日 YYYY-MM-DD の範囲を Postgres へ送るときの ISO 文字列 (UTC) を返す。
 * 後段で `$1::timestamptz`, `$2::timestamptz` として扱う想定。
 */
export function getBusinessDayRangeIso(ymd: string): {
  startIso: string;
  endIso: string;
} {
  const { start, endExclusive } = getBusinessDayRange(ymd);
  return { startIso: start.toISOString(), endIso: endExclusive.toISOString() };
}
