import type {
  ReceiptPayload,
  FullReceiptPayload,
  ExtensionInfoReceiptPayload,
} from '@/lib/printing/escpos-raster';
import { formatYen } from '@/lib/printing/escpos-raster';
import { summarizeSessionPayments, type SessionPayment } from '@/lib/session-payments';

export async function fetchStoreName(): Promise<string> {
  try {
    const res = await fetch('/api/project-variables?name=store_name');
    const json = await res.json();
    if (json?.success && json?.data?.value) return String(json.data.value);
  } catch {
    // ignore
  }
  return 'STORE';
}

export async function fetchStoreAddress(): Promise<string> {
  try {
    const res = await fetch('/api/project-variables?name=store_address');
    const json = await res.json();
    if (json?.success && json?.data?.value) return String(json.data.value).trim();
  } catch {
    // ignore
  }
  return '';
}

export async function fetchStorePhone(): Promise<string> {
  try {
    const res = await fetch('/api/project-variables?name=store_tel');
    const json = await res.json();
    if (json?.success && json?.data?.value) return String(json.data.value).trim();
  } catch {
    // ignore
  }
  return '';
}

export async function fetchReceiptGreeting(): Promise<string> {
  try {
    const res = await fetch('/api/project-variables?name=receipt_greeting');
    const json = await res.json();
    if (json?.success && json?.data?.value != null) return String(json.data.value).trim();
  } catch {
    // ignore
  }
  return 'ありがとうございます。\nまたのご来店をお待ちしております。';
}

export async function fetchStoreId(): Promise<string> {
  try {
    const res = await fetch('/api/project-variables?name=store_id');
    const json = await res.json();
    if (json?.success && json?.data?.value != null) return String(json.data.value).trim();
  } catch {
    // ignore
  }
  return '';
}

export async function fetchPaymentId(): Promise<string> {
  try {
    const res = await fetch('/api/receipt-payment-id');
    const json = await res.json();
    if (json?.success && json?.data?.paymentId) return String(json.data.paymentId);
  } catch {
    // ignore
  }
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `${ymd}000`;
}

type BuildArgs = {
  storeName: string;
  tableName: string;
  issuedAt: Date;
  cartOrders: Array<{ id: number; total_price: number; status: string }>;
  orderRequestStatus: Record<string | number, any>;
  additionalServices: Array<{ charge: number }>;
  guestCount: string;
  addCharges: Record<string, number>;
  setExtensions: Array<{ count: number; timestamp: number; price?: number }>;
  nominations: Array<{ id: number; cast_name: string; type_id: string; cost?: number; created_at: string; updated_at?: string }>;
};

export function buildCurrentAndExtensionReceipts(args: BuildArgs): {
  extension: ReceiptPayload;
  current: ReceiptPayload;
  totals: {
    extensionSetTotal: number;
    nominationExtensionSum: number;
    extensionTotal: number;
    productAndServiceTotal: number;
    sessionFee: number;
    nominationInitialSum: number;
    currentTotal: number;
  };
} {
  const {
    storeName,
    tableName,
    issuedAt,
    cartOrders,
    orderRequestStatus,
    additionalServices,
    guestCount,
    addCharges,
    setExtensions,
    nominations,
  } = args;

  const productTotal = cartOrders.reduce((sum, order) => {
    const st = (orderRequestStatus as any)[order.id] || order.status;
    if (st === 'accepted') return sum + (Number(order.total_price) || 0);
    return sum;
  }, 0);
  const additionalServicesTotal = additionalServices.reduce((sum, s) => sum + (Number(s.charge) || 0), 0);
  const productAndServiceTotal = productTotal + additionalServicesTotal;

  const guest = Math.max(0, parseInt(String(guestCount || '0'), 10) || 0);
  const setPrice = Number(addCharges['set_price'] || 0);
  const sessionFee = setPrice * guest;

  const mainCharge = Number(addCharges['main'] || 0);

  const nominationBreakdown = nominations.map((n: any) => {
    const createdMs = Date.parse(String(n.created_at || n.updated_at || '')) || 0;
    const extCountSince = setExtensions.filter((e: any) => {
      const ts = Number(e?.timestamp);
      return Number.isFinite(ts) && ts > createdMs;
    }).length;
    const extAdd = mainCharge * extCountSince;
    const totalCost = Number(n.cost) || 0;
    const initial = Math.max(0, totalCost - extAdd);
    return { initial, extAdd };
  });

  const nominationInitialSum = nominationBreakdown.reduce((sum, x) => sum + (Number(x.initial) || 0), 0);
  const nominationExtensionSum = nominationBreakdown.reduce((sum, x) => sum + (Number(x.extAdd) || 0), 0);

  const extensionSetTotal = setExtensions.reduce((sum: number, e: any) => {
    const price = Number(e?.price ?? ((Number(addCharges['extension_price'] || 0) || 0) * (Number(e?.count) || 0)));
    return sum + (Number.isFinite(price) ? price : 0);
  }, 0);

  const extensionTotal = extensionSetTotal + nominationExtensionSum;
  const currentTotal = productAndServiceTotal + sessionFee + nominationInitialSum;

  const extension: ReceiptPayload = {
    storeName,
    tableName,
    title: '延長料金',
    issuedAt,
    lines: [
      { left: '入金明細' },
      { left: 'セット延長 合計', right: formatYen(extensionSetTotal) },
      { left: '指名(延長加算) 合計', right: formatYen(nominationExtensionSum) },
    ],
    totalLabel: '総計',
    totalAmount: extensionTotal,
  };

  const current: ReceiptPayload = {
    storeName,
    tableName,
    title: '現在料金',
    issuedAt,
    lines: [
      { left: '入金明細' },
      { left: '商品合計', right: formatYen(productAndServiceTotal) },
      { left: 'セッション料金', right: formatYen(sessionFee) },
      { left: '指名(初期) 合計', right: formatYen(nominationInitialSum) },
    ],
    totalLabel: '総計',
    totalAmount: currentTotal,
  };

  return {
    extension,
    current,
    totals: {
      extensionSetTotal,
      nominationExtensionSum,
      extensionTotal,
      productAndServiceTotal,
      sessionFee,
      nominationInitialSum,
      currentTotal,
    },
  };
}

export type BuildFullReceiptArgs = {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeId?: string;
  greeting: string;
  paymentId: string;
  tableNumber: string;
  sessionStartTime: Date | string;
  guestCount: string;
  paymentMethod: string;
  cartOrders: Array<{ id: number; product_name?: string; amount: number; total_price: number; status: string }>;
  orderRequestStatus: Record<string | number, string>;
  addCharges: Record<string, number>;
  setExtensions: Array<{ count: number; timestamp?: number; price?: number }>;
  nominations: Array<{ cost?: number; cast_name?: string }>;
  additionalServices: Array<{ charge: number }>;
  /** 途中会計がある場合の決済レコード一覧 */
  sessionPayments?: SessionPayment[];
};

export function buildFullReceipt(args: BuildFullReceiptArgs): FullReceiptPayload {
  const {
    storeName,
    storeAddress,
    storePhone,
    storeId = '',
    greeting,
    paymentId,
    tableNumber,
    sessionStartTime,
    guestCount,
    paymentMethod,
    cartOrders,
    orderRequestStatus,
    addCharges,
    setExtensions,
    nominations,
    additionalServices,
    sessionPayments = [],
  } = args;

  const orderLines: Array<{ item: string; qty: number; amount: number }> = [];
  const guest = Math.max(0, parseInt(String(guestCount || '0'), 10) || 0);
  const setPrice = Number(addCharges['set_price'] || 0);
  const sessionFee = setPrice * guest;

  if (sessionFee > 0) {
    orderLines.push({ item: 'セット料金', qty: guest, amount: sessionFee });
  }

  const extensionTotal = setExtensions.reduce((sum: number, e: any) => {
    const price = Number(e?.price ?? ((Number(addCharges['extension_price'] || 0) || 0) * (Number(e?.count) || 0)));
    return sum + (Number.isFinite(price) ? price : 0);
  }, 0);
  if (extensionTotal > 0) {
    const extCount = setExtensions.reduce((s, e) => s + (Number(e?.count) || 0), 0);
    orderLines.push({ item: 'セット延長', qty: extCount || 1, amount: extensionTotal });
  }

  const acceptedCart = cartOrders.filter(o => (orderRequestStatus[o.id] || o.status) === 'accepted');
  for (const order of acceptedCart) {
    const name = (order as any).product_name || '商品';
    const qty = Math.max(1, Number(order.amount) || 1);
    const amount = Number(order.total_price) || 0;
    if (amount > 0) orderLines.push({ item: name, qty, amount });
  }

  const nominationSum = nominations.reduce((s, n) => s + (Number((n as any).cost) || 0), 0);
  if (nominationSum > 0) {
    orderLines.push({ item: '指名料金', qty: 1, amount: nominationSum });
  }

  const additionalTotal = additionalServices.reduce((s, a) => s + (Number(a.charge) || 0), 0);
  if (additionalTotal > 0) {
    orderLines.push({ item: '追加サービス', qty: 1, amount: additionalTotal });
  }

  const subtotal = orderLines.reduce((s, r) => s + r.amount, 0);
  const tax = Math.round(subtotal * 0.1);
  const total = subtotal + tax;
  const taxDetailText = `(内消費税額10%) ${tax.toLocaleString('ja-JP')}円`;

  let startTimeStr: string;
  {
    const d = typeof sessionStartTime === 'string'
      ? new Date(sessionStartTime)
      : new Date(sessionStartTime);
    if (!isNaN(d.getTime())) {
      startTimeStr = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } else {
      startTimeStr = String(sessionStartTime);
    }
  }

  const guestLabel = guestCount ? `${guestCount}名` : '0名';

  const nomineeNames = nominations
    .map((n: any) => n.cast_name)
    .filter((name: any): name is string => !!name && typeof name === 'string')
    .filter((name, i, arr) => arr.indexOf(name) === i)
    .join(' / ');

  // Compute partial payment info for receipt display
  let partialPaymentTotal: number | undefined;
  let remainingAmount: number | undefined;
  if (sessionPayments.length > 0) {
    const summary = summarizeSessionPayments(sessionPayments, total);
    if (summary.paidBaseTotal > 0 && !summary.isFullyPaid) {
      partialPaymentTotal = summary.paidBaseTotal;
      remainingAmount = summary.outstanding;
    }
  }

  return {
    storeName,
    tableNumber,
    greeting: greeting || 'ありがとうございます。\nまたのご来店をお待ちしております。',
    storeAddress,
    storePhone,
    paymentId,
    orderLines,
    subtotal,
    tax,
    total,
    taxDetailText,
    storeId,
    paymentMethod: paymentMethod || '－',
    startTime: startTimeStr,
    guestCount: guestLabel,
    nomineeNames: nomineeNames || undefined,
    partialPaymentTotal,
    remainingAmount,
  };
}

export type BuildExtensionInfoReceiptArgs = {
  storeName: string;
  tableNumber: string;
  guestCount: string;
  cartOrders: Array<{ id: number; total_price: number; status: string }>;
  orderRequestStatus: Record<string | number, string>;
  addCharges: Record<string, number>;
  setExtensions: Array<{ count: number; timestamp?: number; price?: number; nomination_unit?: number }>;
  nominations: Array<{ id?: number; cost?: number; type_id?: string }>;
  additionalServices: Array<{ charge: number }>;
  /** デフォルト 60 */
  extensionMinutes?: number;
};

/**
 * 「現在料金 / N分延長」レシートのペイロードを生成する。
 *
 * 「現在料金」: 注文合計画面と同じく (商品 + セッション + セット延長 + 指名 + 追加サービス) に
 *               10% を上乗せした額。
 * 「延長料金」: 同じ条件にもう 1 回セット延長を行ったと仮定したときの合計額。
 *               (extension_price * 人数) と (各指名への加算 = nomination_unit) を加算してから 10% を上乗せ。
 */
export function buildExtensionInfoReceipt(
  args: BuildExtensionInfoReceiptArgs
): ExtensionInfoReceiptPayload {
  const {
    storeName,
    tableNumber,
    guestCount,
    cartOrders,
    orderRequestStatus,
    addCharges,
    setExtensions,
    nominations,
    additionalServices,
    extensionMinutes = 60,
  } = args;

  const guest = Math.max(0, parseInt(String(guestCount || '0'), 10) || 0);
  const setPrice = Number(addCharges['set_price'] || 0);
  const extensionUnit = Number(addCharges['extension_price'] || 0);

  const productTotal = cartOrders.reduce((sum, order) => {
    const status = orderRequestStatus[order.id] || order.status;
    if (status === 'accepted') {
      const price = Number(order.total_price);
      return sum + (Number.isFinite(price) ? price : 0);
    }
    return sum;
  }, 0);

  const sessionFee = setPrice * guest;

  const setExtensionsTotal = setExtensions.reduce((sum, e) => {
    const cnt = Number(e?.count) || 0;
    const price = Number(
      e?.price ?? (extensionUnit * cnt)
    );
    return sum + (Number.isFinite(price) ? price : 0);
  }, 0);

  const nominationTotal = nominations.reduce((sum, n) => sum + (Number((n as any).cost) || 0), 0);
  const additionalTotal = additionalServices.reduce((sum, s) => sum + (Number(s.charge) || 0), 0);

  const currentSubtotal = productTotal + sessionFee + setExtensionsTotal + nominationTotal + additionalTotal;
  const currentTotal = Math.round(currentSubtotal * 1.1);

  const projectedGuests = guest > 0 ? guest : Math.max(1, Number(setExtensions?.[setExtensions.length - 1]?.count) || 1);
  const nextSetExtensionCost = extensionUnit * projectedGuests;

  const savedNominationUnitRaw = Number((setExtensions?.[0] as any)?.nomination_unit);
  const nominationUnit =
    Number.isFinite(savedNominationUnitRaw) && savedNominationUnitRaw >= 0
      ? savedNominationUnitRaw
      : Number(addCharges['main']) || 0;

  const eligibleNominations = nominations.filter((n) => {
    const t = String((n as any).type_id || '');
    return t === 'main' || t === 'inside' || t === 'together';
  });
  const nominationExtensionCost = nominationUnit * eligibleNominations.length;

  const projectedSubtotal = currentSubtotal + nextSetExtensionCost + nominationExtensionCost;
  const extensionTotal = Math.round(projectedSubtotal * 1.1);

  const safeGuest = Math.max(1, guest);
  const currentPerPerson = Math.floor(currentTotal / safeGuest);
  const currentRemainder = currentTotal - currentPerPerson * safeGuest;
  const extensionPerPerson = Math.floor(extensionTotal / safeGuest);
  const extensionRemainder = extensionTotal - extensionPerPerson * safeGuest;

  return {
    storeName,
    tableNumber,
    currentLabel: '現在料金',
    currentTotal,
    currentPerPerson,
    currentRemainder,
    extensionLabel: `${extensionMinutes}分延長`,
    extensionTotal,
    extensionPerPerson,
    extensionRemainder,
    footerNote: 'サービスTAX込 指名延長料込',
  };
}

