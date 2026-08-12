/**
 * セッション決済（session_payments）に関する共通ロジック。
 *
 * 用語:
 *  - 請求合計 (billTotal): 注文合計の支払額（手数料・端数処理後）。
 *  - 受領済み (paidBaseTotal): 請求合計に充当された金額の合計（= Σ amount − Σ fee_amount）。
 *  - 受領総額 (paidGrossTotal): お客様が実際に支払った合計（= Σ amount。手数料分を含む）。
 *  - 手数料合計 (paidFeeTotal): Σ fee_amount。
 *  - 残金 (outstanding): max(billTotal − paidBaseTotal, 0)。
 *
 * カード決済時、手数料はお客様が「上乗せ」で負担する想定 (Customer-bear model)。
 *   例) 請求 10,000 円・手数料率 10% → カードに 11,000 円請求、
 *       amount = 11,000, fee_rate = 10, fee_amount = 1,000、
 *       請求合計への充当額 = amount − fee_amount = 10,000。
 */

export type SessionPaymentMethod = 0 | 1 | 2;

export interface SessionPayment {
  id: number;
  session_id: number;
  pay_type: SessionPaymentMethod | number;
  amount: number | string;
  fee_rate?: number | string | null;
  fee_amount?: number | string | null;
  other?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SessionPaymentSummary {
  /** 顧客が実際に支払った合計（手数料込み） */
  paidGrossTotal: number;
  /** 請求合計への充当合計 */
  paidBaseTotal: number;
  /** 手数料の合計 */
  paidFeeTotal: number;
  /** 残金 (billTotal − paidBaseTotal, 0 未満は 0) */
  outstanding: number;
  /** すべての受領（base 合計）が請求合計以上に達しているか */
  isFullyPaid: boolean;
  /** 種別ごとの内訳 */
  byMethod: {
    cash: number;
    storeCard: number;
    onlineCard: number;
  };
}

export function toNumber(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** payment 1件あたりの「請求合計への充当額」 = amount − fee_amount。 */
export function effectiveBaseAmount(p: SessionPayment): number {
  return Math.max(toNumber(p.amount) - toNumber(p.fee_amount), 0);
}

/** カード決済の手数料を amount から逆算する（amount が手数料込みの場合）。 */
export function computeFeeFromGross(grossAmount: number, feeRatePercent: number): number {
  if (!(feeRatePercent > 0)) return 0;
  const rate = feeRatePercent / 100;
  // gross = base × (1 + rate) → fee = gross × rate / (1 + rate)
  return Math.round((grossAmount * rate) / (1 + rate));
}

/** base 金額と手数料率からカード請求合計 (gross) を計算する。 */
export function computeGrossFromBase(baseAmount: number, feeRatePercent: number): number {
  if (!(feeRatePercent > 0)) return Math.max(0, Math.round(baseAmount));
  const rate = feeRatePercent / 100;
  return Math.max(0, Math.round(baseAmount * (1 + rate)));
}

export function summarizeSessionPayments(
  payments: SessionPayment[],
  billTotal: number
): SessionPaymentSummary {
  let paidGrossTotal = 0;
  let paidFeeTotal = 0;
  let cash = 0;
  let storeCard = 0;
  let onlineCard = 0;
  for (const p of payments) {
    const amt = toNumber(p.amount);
    const fee = toNumber(p.fee_amount);
    paidGrossTotal += amt;
    paidFeeTotal += fee;
    const base = Math.max(amt - fee, 0);
    const t = Number(p.pay_type);
    if (t === 1) cash += base;
    else if (t === 0) storeCard += base;
    else if (t === 2) onlineCard += base;
  }
  const paidBaseTotal = Math.max(paidGrossTotal - paidFeeTotal, 0);
  const outstanding = Math.max(billTotal - paidBaseTotal, 0);
  const isFullyPaid = billTotal > 0 && paidBaseTotal + 0.0001 >= billTotal;
  return {
    paidGrossTotal,
    paidBaseTotal,
    paidFeeTotal,
    outstanding,
    isFullyPaid,
    byMethod: { cash, storeCard, onlineCard },
  };
}

/** 支払い方法のラベル（pay_type → 表示名） */
export function payTypeLabel(payType: number): string {
  if (payType === 0) return '店舗用クレジットカード';
  if (payType === 1) return '現金';
  if (payType === 2) return 'クレジットカード';
  return '－';
}

/**
 * 支払い内訳から領収書用の「支払方法」表記を組み立てる。
 *   例) 「現金 + 店舗用クレジットカード」
 */
export function buildPaymentMethodSummary(payments: SessionPayment[]): string {
  const seen = new Set<number>();
  const labels: string[] = [];
  for (const p of payments) {
    const t = Number(p.pay_type);
    if (toNumber(p.amount) <= 0) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    labels.push(payTypeLabel(t));
  }
  return labels.length > 0 ? labels.join(' + ') : '－';
}

/** 標準の手数料率候補。設定モーダル等で利用 */
export const CARD_FEE_RATE_OPTIONS: ReadonlyArray<number> = [0, 10, 15, 20];
