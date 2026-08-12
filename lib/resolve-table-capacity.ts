/** 収容人数: 空は null（未設定）、入力時は 1 以上の整数のみ許可 */
export function resolveCapacityInput(
  raw: unknown
): { ok: true; value: number | null } | { ok: false; error: string } {
  if (raw === null || raw === undefined || raw === '') {
    return { ok: true, value: null };
  }
  const n = typeof raw === 'number' ? raw : parseInt(String(raw).trim(), 10);
  if (Number.isNaN(n) || n <= 0) {
    return { ok: false, error: '収容人数は1以上の数値を入力するか、未入力にしてください。' };
  }
  return { ok: true, value: n };
}
