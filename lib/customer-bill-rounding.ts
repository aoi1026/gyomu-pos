/**
 * お客様請求（注文合計）の端数処理。project variable `customer_bill_round_up_to_yen` と連動。
 */

export type AdditionalServiceBillRow = {
  type: string;
  charge?: number | string;
  note?: string | null;
  count?: number;
};

/** API／設定値から切り上げ単位（円）を解釈。0 または不正値は「端数処理なし」 */
export function parseCustomerBillRoundUpUnit(raw: unknown): number {
  if (raw == null || raw === '') return 0;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

/** 正の金額を unit 円の倍数に切り上げ。unit が 0 以下のときは四捨五入で整数円。 */
export function ceilToPositiveMultiple(amount: number, unit: number): number {
  if (!Number.isFinite(amount)) return 0;
  if (amount <= 0) return 0;
  if (!Number.isFinite(unit) || unit <= 0) return Math.round(amount);
  return Math.ceil(amount / unit) * unit;
}

export function customerBillLineDisplayAmount(raw: number, roundUnitYen: number): number {
  if (!Number.isFinite(raw)) return 0;
  if (roundUnitYen <= 0) return raw;
  if (raw <= 0) return 0;
  return ceilToPositiveMultiple(raw, roundUnitYen);
}

export function additionalServicesDisplayRawTotals(services: AdditionalServiceBillRow[]): number[] {
  const mergedTypes = ['vip_room', 'karaoke'] as const;
  const totals: number[] = [];

  const sumCharge = (arr: AdditionalServiceBillRow[]) =>
    arr.reduce((sum, s) => {
      const v = Number(s?.charge);
      return sum + (Number.isFinite(v) ? v : 0);
    }, 0);

  for (const type of mergedTypes) {
    const rows = services.filter((s) => s?.type === type);
    if (rows.length === 0) continue;
    const baseRows = rows.filter((s) => String(s?.note || '') !== 'セット延長');
    const extRows = rows.filter((s) => String(s?.note || '') === 'セット延長');
    totals.push(sumCharge(baseRows) + sumCharge(extRows));
  }

  // 飲み放題は「追加サービス」ではなく「セッション料金」に反映するため、ここでは除外します。
  const otherRows = services.filter(
    (s) => s?.type !== 'vip_room' && s?.type !== 'karaoke' && s?.type !== 'nomihoudai'
  );
  for (const s of otherRows) {
    const v = Number(s?.charge);
    totals.push(Number.isFinite(v) ? v : 0);
  }
  return totals;
}

export function collectOrderBillRawLines(params: {
  cartOrders: Array<{ id: string | number; total_price?: number | string; status?: string }>;
  orderRequestStatus: Record<string, string>;
  guestCount: string;
  setPrice: number;
  setExtensions: Array<{ count: number; price?: number }>;
  extensionUnit: number;
  nominations: unknown[];
  nominationLineTotal: (n: unknown) => number;
  additionalServices: AdditionalServiceBillRow[];
}): number[] {
  const lines: number[] = [];

  for (const order of params.cartOrders) {
    const status = params.orderRequestStatus[String(order.id)] ?? order.status ?? '';
    if (status === 'accepted') {
      const price = Number(order.total_price);
      lines.push(Number.isFinite(price) && !isNaN(price) ? price : 0);
    }
  }

  if (params.guestCount && params.guestCount.trim() !== '') {
    const cnt = parseInt(params.guestCount, 10);
    if (!isNaN(cnt) && cnt > 0 && params.setPrice > 0) {
      lines.push(params.setPrice * cnt);
    }
  }

  for (const extension of params.setExtensions) {
    if (extension.count > 0) {
      const raw = Number(extension.price ?? params.extensionUnit * extension.count);
      lines.push(Number.isFinite(raw) ? raw : 0);
    }
  }

  for (const n of params.nominations) {
    lines.push(params.nominationLineTotal(n));
  }

  lines.push(...additionalServicesDisplayRawTotals(params.additionalServices));
  return lines;
}

export function computeCustomerBillTotals(
  rawLines: number[],
  roundUnitYen: number
): {
  subtotalRaw: number;
  subtotalBilled: number;
  serviceFee: number;
  total: number;
} {
  const safe = rawLines.map((x) => (Number.isFinite(x) ? x : 0));
  const subtotalRaw = safe.reduce((a, b) => a + b, 0);

  if (!Number.isFinite(roundUnitYen) || roundUnitYen <= 0) {
    const serviceFee = Math.round(subtotalRaw * 0.1);
    return {
      subtotalRaw,
      subtotalBilled: subtotalRaw,
      serviceFee,
      total: subtotalRaw + serviceFee,
    };
  }

  const subtotalBilled = safe.reduce((a, b) => a + ceilToPositiveMultiple(b, roundUnitYen), 0);
  const serviceFee = ceilToPositiveMultiple(subtotalBilled * 0.1, roundUnitYen);
  return {
    subtotalRaw,
    subtotalBilled,
    serviceFee,
    total: subtotalBilled + serviceFee,
  };
}

/**
 * 請求合計（サービス手数料込みの最終額）を決済用に整数円へ整える。
 * computeCustomerBillTotals の total を渡す想定。10% の再計算は行わない。
 */
export function customerBillPaymentAmount(totalWithFee: number, roundUnitYen: number): number {
  if (!Number.isFinite(totalWithFee)) return 0;
  if (!Number.isFinite(roundUnitYen) || roundUnitYen <= 0) return Math.round(totalWithFee);
  return ceilToPositiveMultiple(totalWithFee, roundUnitYen);
}
