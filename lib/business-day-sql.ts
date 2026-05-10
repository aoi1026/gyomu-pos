/**
 * 業務日（朝 6:00 JST 境界）を Postgres SQL で扱うためのユーティリティ。
 *
 * - `businessDateExpr('a.clock_in')` → 任意の timestamptz 列の業務日 date を返す式
 * - `businessDayStartExpr('$1')`     → パラメータ `$1` の業務日 06:00 JST を timestamptz で返す式
 * - `businessDayPlusExpr('$1', n)`   → `$1` の業務日 + n 日（06:00 JST 開始）の timestamptz
 *
 * 例：「業務日 $1 に発生した clock_in 行を取得」
 *   WHERE a.clock_in >= ${businessDayStartExpr('$1')}
 *     AND a.clock_in <  ${businessDayPlusExpr('$1', 1)}
 *
 * 例：「clock_in を業務日でグループ化」
 *   SELECT ${businessDateExpr('a.clock_in')} AS business_date,
 *          COUNT(*) ...
 */

export const BUSINESS_DAY_BOUNDARY_HOUR = 6;
export const BUSINESS_TIMEZONE = 'Asia/Tokyo';

/**
 * 任意の `timestamptz` 列を業務日 (DATE) に変換する式。
 *
 *   ((ts AT TIME ZONE 'Asia/Tokyo') - interval '6 hours')::date
 *
 *  - 2026-05-10 03:00 JST → 業務日 2026-05-09
 *  - 2026-05-10 06:00 JST → 業務日 2026-05-10
 */
export function businessDateExpr(tsExpr: string): string {
  return `(((${tsExpr}) AT TIME ZONE '${BUSINESS_TIMEZONE}') - interval '${BUSINESS_DAY_BOUNDARY_HOUR} hours')::date`;
}

/**
 * 業務日 (DATE 形式パラメータ) の **始点** (= 当日 06:00 JST) を `timestamptz` で返す式。
 *
 *   (($1::date + time '06:00') AT TIME ZONE 'Asia/Tokyo')
 */
export function businessDayStartExpr(dateParam: string): string {
  return `(((${dateParam})::date + time '0${BUSINESS_DAY_BOUNDARY_HOUR}:00') AT TIME ZONE '${BUSINESS_TIMEZONE}')`;
}

/**
 * 業務日 (DATE 形式パラメータ) + N 日 の境界 (= 06:00 JST) を `timestamptz` で返す式。
 *  N=1 なら「業務日の終端 (排他)」になる。
 */
export function businessDayPlusExpr(dateParam: string, days: number): string {
  return `(((${dateParam})::date + interval '${days} days' + time '0${BUSINESS_DAY_BOUNDARY_HOUR}:00') AT TIME ZONE '${BUSINESS_TIMEZONE}')`;
}

/**
 * 「現在の業務日」(= NOW() を業務日に変換した DATE) を返す式。
 */
export function currentBusinessDateExpr(): string {
  return businessDateExpr('NOW()');
}
