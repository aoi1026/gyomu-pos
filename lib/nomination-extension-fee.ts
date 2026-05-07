/**
 * 1回のセット延長につき、指名1件へ加算する料金（本指名料金ベース）。
 * 場内／同伴も延長時は同額を加算する既存仕様に合わせる。
 */
export function perNominationExtensionCharge(
  typeId: string,
  charges: Record<string, number>
): number {
  const main = charges['main'] || 0;
  if (typeId === 'inside' || typeId === 'together' || typeId === 'main') {
    return main;
  }
  return main;
}

export function extensionUnitPrice(
  ext: { price?: number; count?: number },
  fallbackUnit: number
): number {
  const count = Number(ext?.count) || 0;
  const price = Number(ext?.price);
  if (count > 0 && Number.isFinite(price)) return price / count;
  return fallbackUnit;
}
