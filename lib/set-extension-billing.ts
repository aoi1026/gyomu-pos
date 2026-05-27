/** set_extensions JSON 1件分 */
export type SetExtensionEntry = {
  count: number;
  timestamp: number;
  price?: number;
  nomination_unit?: number;
  /** 延長時に飲み放題プランを適用したか */
  nomihoudai?: boolean;
};

export function computeSetExtensionLineTotal(
  extensionPricePerGuest: number,
  guestCount: number,
  nomihoudaiEnabled: boolean,
  nomihoudaiPricePerGuest: number
): number {
  const count = Math.max(0, Math.floor(guestCount) || 0);
  if (count <= 0) return 0;
  const base = (Number(extensionPricePerGuest) || 0) * count;
  const nomi =
    nomihoudaiEnabled && (Number(nomihoudaiPricePerGuest) || 0) > 0
      ? Number(nomihoudaiPricePerGuest) * count
      : 0;
  return base + nomi;
}

export function buildSetExtensionEntry(params: {
  guestCount: number;
  extensionPricePerGuest: number;
  nominationUnit: number;
  nomihoudaiEnabled: boolean;
  nomihoudaiPricePerGuest: number;
  timestamp?: number;
}): SetExtensionEntry {
  const count = params.guestCount;
  return {
    count,
    timestamp: params.timestamp ?? Date.now(),
    price: computeSetExtensionLineTotal(
      params.extensionPricePerGuest,
      count,
      params.nomihoudaiEnabled,
      params.nomihoudaiPricePerGuest
    ),
    nomination_unit: params.nominationUnit,
    ...(params.nomihoudaiEnabled ? { nomihoudai: true } : {}),
  };
}

export function extensionEntryDisplayTotal(
  extension: SetExtensionEntry,
  extensionPricePerGuest: number
): number {
  const stored = Number(extension.price);
  if (Number.isFinite(stored) && stored > 0) return stored;
  const unit = Number(extensionPricePerGuest) || 0;
  return unit * (Number(extension.count) || 0);
}
