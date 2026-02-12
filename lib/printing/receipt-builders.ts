import type { ReceiptPayload } from '@/lib/printing/escpos-raster';
import { formatYen } from '@/lib/printing/escpos-raster';

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

