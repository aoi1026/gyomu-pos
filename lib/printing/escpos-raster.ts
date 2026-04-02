type ReceiptLine = {
  left: string;
  right?: string;
};

export type ReceiptPayload = {
  storeName: string;
  tableName: string;
  title: string; // e.g. "現在料金", "延長料金"
  issuedAt: Date;
  lines: ReceiptLine[];
  totalLabel: string;
  totalAmount: number;
  /** 最下部中央に表示（住所、電話番号など） */
  footerAddress?: string;
  footerPhone?: string;
};

/** 領収書（画像デザイン準拠）: 店舗名・テーブル番号・挨拶・店舗情報・注文明細・小計税合計・管理情報 */
export type FullReceiptPayload = {
  storeName: string;
  tableNumber: string; // e.g. "05" → 表示は【05】
  greeting: string;
  storeAddress: string;
  storePhone: string;
  paymentId: string; // 西暦+月+日+連番3桁
  orderLines: Array<{ item: string; qty: number; amount: number }>;
  subtotal: number;
  tax: number;
  total: number;
  taxDetailText: string; // e.g. "(内消費税額10%) 800円"
  storeId: string;
  paymentMethod: string;
  startTime: string;
  guestCount: string;
};

function formatYen(amount: number) {
  const n = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `¥${n.toLocaleString('ja-JP')}`;
}

function formatIssuedAt(d: Date) {
  // Simple local time format (Windows/Japan environments OK).
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd} ${hh}:${mi}`;
}

function escposInit(): number[] {
  return [0x1b, 0x40]; // ESC @
}

function escposFeed(n: number): number[] {
  const v = Math.max(0, Math.min(255, n));
  return [0x1b, 0x64, v]; // ESC d n
}

function escposCut(): number[] {
  return [0x1d, 0x56, 0x00]; // GS V 0 (full cut)
}

function escposRasterHeader(widthPx: number, heightPx: number): number[] {
  // GS v 0
  // xL xH: width in bytes
  const widthBytes = Math.ceil(widthPx / 8);
  const xL = widthBytes & 0xff;
  const xH = (widthBytes >> 8) & 0xff;
  const yL = heightPx & 0xff;
  const yH = (heightPx >> 8) & 0xff;
  return [0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH];
}

function canvasToRasterBytes(canvas: HTMLCanvasElement): Uint8Array {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvasが利用できません');
  const { width, height } = canvas;
  const img = ctx.getImageData(0, 0, width, height).data;
  const widthBytes = Math.ceil(width / 8);
  const out = new Uint8Array(widthBytes * height);

  for (let y = 0; y < height; y++) {
    for (let xb = 0; xb < widthBytes; xb++) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit++) {
        const x = xb * 8 + bit;
        const idx = (y * width + x) * 4;
        // White for out-of-bounds pixels (right padding)
        const r = x < width ? img[idx] : 255;
        const g = x < width ? img[idx + 1] : 255;
        const b = x < width ? img[idx + 2] : 255;
        const a = x < width ? img[idx + 3] : 255;
        const lum = (r * 0.299 + g * 0.587 + b * 0.114) * (a / 255);
        const isBlack = lum < 180; // threshold
        if (isBlack) byte |= 0x80 >> bit;
      }
      out[y * widthBytes + xb] = byte;
    }
  }
  return out;
}

export function makeReceiptCanvas(payload: ReceiptPayload, widthPx: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvasが利用できません');

  // Layout
  const padX = 18;
  const yGap = 6;
  const fontNormal = 22;
  const fontSmall = 18;
  const fontTitle = 26;

  const footerLines = [payload.footerAddress, payload.footerPhone].filter(Boolean).length;
  const h =
    40 + // top margin
    (fontTitle + yGap) + // store
    (fontSmall + yGap) + // table
    (fontSmall + yGap) + // title
    10 + // separator
    payload.lines.length * (fontNormal + yGap) +
    20 + // separator
    (fontTitle + yGap) + // total
    (fontSmall + yGap) + // issuedAt
    (footerLines + 1) * (fontSmall + yGap) + // 時間・住所・電話
    60; // bottom margin / feed

  canvas.width = widthPx;
  canvas.height = Math.max(200, h);

  // White background
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000';

  let y = 30;

  // Store name (center, bold-ish)
  ctx.textAlign = 'center';
  ctx.font = `bold ${fontTitle}px sans-serif`;
  ctx.fillText(payload.storeName || 'STORE', canvas.width / 2, y);
  y += fontTitle + yGap;

  // Table name
  ctx.font = `${fontSmall}px sans-serif`;
  ctx.fillText(payload.tableName, canvas.width / 2, y);
  y += fontSmall + yGap;

  // Title
  ctx.font = `bold ${fontSmall}px sans-serif`;
  ctx.fillText(`【${payload.title}】`, canvas.width / 2, y);
  y += fontSmall + yGap;

  // Separator
  ctx.textAlign = 'left';
  ctx.font = `${fontSmall}px monospace`;
  ctx.fillText('-'.repeat(Math.floor((canvas.width - padX * 2) / 10)), padX, y);
  y += 14;

  // Lines
  ctx.font = `${fontNormal}px sans-serif`;
  for (const line of payload.lines) {
    const left = line.left ?? '';
    const right = line.right ?? '';
    ctx.textAlign = 'left';
    ctx.fillText(left, padX, y);
    if (right) {
      ctx.textAlign = 'right';
      ctx.fillText(right, canvas.width - padX, y);
    }
    y += fontNormal + yGap;
  }

  // Separator
  ctx.textAlign = 'left';
  ctx.font = `${fontSmall}px monospace`;
  ctx.fillText('-'.repeat(Math.floor((canvas.width - padX * 2) / 10)), padX, y);
  y += 18;

  // Total
  ctx.textAlign = 'left';
  ctx.font = `bold ${fontTitle}px sans-serif`;
  ctx.fillText(payload.totalLabel, padX, y);
  ctx.textAlign = 'right';
  ctx.fillText(formatYen(payload.totalAmount), canvas.width - padX, y);
  y += fontTitle + yGap;

  // 最下部中央: 発行日時、住所、電話番号
  ctx.textAlign = 'center';
  ctx.font = `${fontSmall}px sans-serif`;
  ctx.fillText(`発行: ${formatIssuedAt(payload.issuedAt)}`, canvas.width / 2, y);
  y += fontSmall + yGap;
  if (payload.footerAddress?.trim()) {
    ctx.fillText(`住所: ${payload.footerAddress.trim()}`, canvas.width / 2, y);
    y += fontSmall + yGap;
  }
  if (payload.footerPhone?.trim()) {
    ctx.fillText(`電話番号: ${payload.footerPhone.trim()}`, canvas.width / 2, y);
  }

  return canvas;
}

export function buildEscPosRasterReceipt(payload: ReceiptPayload, opts?: { widthPx?: number }): Uint8Array {
  const widthPx = opts?.widthPx ?? 576; // 80mm class (TM-m30)
  const canvas = makeReceiptCanvas(payload, widthPx);
  const raster = canvasToRasterBytes(canvas);
  const header = escposRasterHeader(canvas.width, canvas.height);
  const bytes: number[] = [];
  bytes.push(...escposInit());
  bytes.push(...header);
  bytes.push(...Array.from(raster));
  bytes.push(...escposFeed(6));
  bytes.push(...escposCut());
  return new Uint8Array(bytes);
}

export function makeFullReceiptCanvas(payload: FullReceiptPayload, widthPx: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvasが利用できません');

  const padX = 18;
  const yGap = 4;
  const fontNorm = 20;
  const fontSmall = 16;
  const fontStore = 28;
  const fontTotal = 24;

  const greetingLines = (payload.greeting || '').split(/\r?\n/).filter(Boolean);
  const lineH = fontNorm + yGap;
  const h =
    32 + (fontStore + yGap) + (fontSmall + yGap) + // table
    Math.max(1, greetingLines.length) * (fontSmall + yGap) +
    12 + (fontSmall + yGap) * 3 + // address, phone, paymentId
    10 + (fontSmall + yGap) + // 項目 数量 金額
    payload.orderLines.length * lineH +
    14 + (fontSmall + yGap) * 2 + // 小計 TAX
    14 + (fontTotal + yGap) + (fontSmall + yGap) + // 合計、消費税
    12 + (fontSmall + yGap) * 4 + 40; // 店舗ID, 支払方法, 開始時間, 人数

  canvas.width = widthPx;
  canvas.height = Math.max(400, h);

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000';

  let y = 24;

  ctx.textAlign = 'center';
  ctx.font = `bold ${fontStore}px sans-serif`;
  ctx.fillText(payload.storeName || 'STORE', canvas.width / 2, y);
  y += fontStore + yGap;

  ctx.font = `${fontSmall}px sans-serif`;
  ctx.fillText(`【${payload.tableNumber}】`, canvas.width / 2, y);
  y += fontSmall + yGap;

  for (const line of greetingLines) {
    ctx.fillText(line.trim(), canvas.width / 2, y);
    y += fontSmall + yGap;
  }
  y += 6;

  ctx.textAlign = 'left';
  ctx.font = `${fontSmall}px sans-serif`;
  if (payload.storeAddress?.trim()) {
    ctx.fillText(payload.storeAddress.trim(), padX, y);
    y += fontSmall + yGap;
  }
  if (payload.storePhone?.trim()) {
    ctx.fillText(`TEL:${payload.storePhone.trim()}`, padX, y);
    y += fontSmall + yGap;
  }
  if (payload.paymentId) {
    ctx.fillText(`登録番号:${payload.paymentId}`, padX, y);
    y += fontSmall + yGap;
  }
  y += 6;

  ctx.font = `bold ${fontSmall}px sans-serif`;
  ctx.fillText('項目', padX, y);
  ctx.textAlign = 'right';
  ctx.fillText('数量', canvas.width - padX - 90, y);
  ctx.fillText('金額', canvas.width - padX, y);
  ctx.textAlign = 'left';
  y += fontSmall + yGap;

  ctx.font = `${fontNorm}px sans-serif`;
  for (const row of payload.orderLines) {
    ctx.fillText(truncate(row.item, 22), padX, y);
    ctx.textAlign = 'right';
    ctx.fillText(String(row.qty), canvas.width - padX - 90, y);
    ctx.fillText(formatYen(row.amount), canvas.width - padX, y);
    ctx.textAlign = 'left';
    y += lineH;
  }

  y += 6;
  ctx.moveTo(padX, y);
  ctx.lineTo(canvas.width - padX, y);
  ctx.stroke();
  y += 10;

  ctx.font = `${fontNorm}px sans-serif`;
  ctx.fillText('小計', padX, y);
  ctx.textAlign = 'right';
  ctx.fillText(formatYen(payload.subtotal), canvas.width - padX, y);
  ctx.textAlign = 'left';
  y += lineH;
  ctx.fillText('SC TAX', padX, y);
  ctx.textAlign = 'right';
  ctx.fillText(formatYen(payload.tax), canvas.width - padX, y);
  ctx.textAlign = 'left';
  y += 10;

  ctx.moveTo(padX, y);
  ctx.lineTo(canvas.width - padX, y);
  ctx.stroke();
  y += 12;

  ctx.font = `bold ${fontTotal}px sans-serif`;
  ctx.fillText('合計', padX, y);
  ctx.textAlign = 'right';
  ctx.fillText(`${formatYen(payload.total)}-`, canvas.width - padX, y);
  ctx.textAlign = 'left';
  y += fontTotal + yGap;

  ctx.font = `${fontSmall}px sans-serif`;
  ctx.fillText(payload.taxDetailText || '', padX, y);
  y += fontSmall + yGap + 8;

  if (payload.storeId) {
    ctx.fillText(`ID:${payload.storeId}`, padX, y);
    y += fontSmall + yGap;
  }
  if (payload.paymentMethod) {
    ctx.fillText(`支払方法:${payload.paymentMethod}`, padX, y);
    y += fontSmall + yGap;
  }
  if (payload.startTime) {
    ctx.fillText(`開台時間:${payload.startTime}`, padX, y);
    y += fontSmall + yGap;
  }
  if (payload.guestCount) {
    ctx.fillText(`開台人数:${payload.guestCount}`, padX, y);
  }

  return canvas;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

export function buildFullReceiptEscPos(payload: FullReceiptPayload, opts?: { widthPx?: number }): Uint8Array {
  const widthPx = opts?.widthPx ?? 576;
  const canvas = makeFullReceiptCanvas(payload, widthPx);
  const raster = canvasToRasterBytes(canvas);
  const header = escposRasterHeader(canvas.width, canvas.height);
  const bytes: number[] = [];
  bytes.push(...escposInit());
  bytes.push(...header);
  bytes.push(...Array.from(raster));
  bytes.push(...escposFeed(6));
  bytes.push(...escposCut());
  return new Uint8Array(bytes);
}

export { formatYen };

