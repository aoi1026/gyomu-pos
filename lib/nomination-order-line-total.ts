/**
 * 注文合計・指名明細の右列で使う「指名1件あたりの請求額」。
 * 明細の内訳（初期指名料 ＋ 固定された延長時の本指名相当単価 × 延長回数）と一致させる。
 */
export function nominationOrderLineTotal(
  nomination: any,
  setExtensions: any[],
  charges: Record<string, number>
): number {
  const totalCost = Number(nomination?.cost) || 0;
  const mainCharge = Number(charges['main']) || 0;
  const togetherCharge = Number(charges['together']) || 0;
  const createdMs =
    Date.parse(String(nomination?.created_at || nomination?.updated_at || '')) || 0;
  const extCountSince = setExtensions.filter((e: any) => {
    const ts = Number(e?.timestamp);
    return Number.isFinite(ts) && ts > createdMs;
  }).length;

  const extAddLegacy = mainCharge * extCountSince;
  const rawInitial = nomination?.initial_nomination_cost;
  const hasStoredInitial =
    rawInitial != null && rawInitial !== '' && Number.isFinite(Number(rawInitial));
  const initialDisplay = hasStoredInitial
    ? Number(rawInitial)
    : Math.max(0, totalCost - extAddLegacy);

  const relevantExts = setExtensions.filter((e: any) => {
    const ts = Number(e?.timestamp);
    return Number.isFinite(ts) && ts > createdMs;
  });
  const unitFromExtRaw = Number(relevantExts?.[0]?.nomination_unit);
  const extSum = Math.max(0, totalCost - initialDisplay);
  const perExt =
    Number.isFinite(unitFromExtRaw) && unitFromExtRaw >= 0
      ? unitFromExtRaw
      : extCountSince > 0 && extSum > 0
        ? extSum / extCountSince
        : 0;

  const typeId = String(nomination?.type_id || '');
  if (typeId === 'together') {
    const baseInit = hasStoredInitial ? initialDisplay : togetherCharge;
    return baseInit + perExt * extCountSince;
  }

  if (extCountSince === 0) {
    return hasStoredInitial ? initialDisplay : totalCost;
  }
  return initialDisplay + perExt * extCountSince;
}
