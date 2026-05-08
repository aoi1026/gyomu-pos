type ReceiptLine = {
  left: string;
  right?: string;
};

export type ReceiptPayload = {
  storeName: string;
  tableName: string;
  title: string;
  issuedAt: Date;
  lines: ReceiptLine[];
  totalLabel: string;
  totalAmount: number;
  footerAddress?: string;
  footerPhone?: string;
};

export type FullReceiptPayload = {
  storeName: string;
  tableNumber: string;
  greeting: string;
  storeAddress: string;
  storePhone: string;
  paymentId: string;
  orderLines: Array<{ item: string; qty: number; amount: number }>;
  subtotal: number;
  tax: number;
  total: number;
  taxDetailText: string;
  storeId: string;
  paymentMethod: string;
  startTime: string;
  guestCount: string;
  nomineeNames?: string;
};

export type ExtensionInfoReceiptPayload = {
  storeName: string;
  tableNumber: string;
  currentLabel: string;
  currentTotal: number;
  currentPerPerson: number;
  currentRemainder: number;
  extensionLabel: string;
  extensionTotal: number;
  extensionPerPerson: number;
  extensionRemainder: number;
  footerNote?: string;
};

export function formatYen(amount: number) {
  const n = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `¥${n.toLocaleString('ja-JP')}`;
}

function formatAmountPlain(amount: number): string {
  const n = Number.isFinite(amount) ? Math.round(amount) : 0;
  return n.toLocaleString('ja-JP');
}

function formatAmountEn(amount: number): string {
  return `${formatAmountPlain(amount)}円`;
}

function formatIssuedAt(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd} ${hh}:${mi}`;
}

function drawDashedLine(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number) {
  ctx.save();
  ctx.setLineDash([4, 3]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
}

function escposInit(): number[] {
  return [0x1b, 0x40];
}

function escposFeed(n: number): number[] {
  const v = Math.max(0, Math.min(255, n));
  return [0x1b, 0x64, v];
}

function escposCut(): number[] {
  return [0x1d, 0x56, 0x00];
}

function escposRasterHeader(widthPx: number, heightPx: number): number[] {
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
        const r = x < width ? img[idx] : 255;
        const g = x < width ? img[idx + 1] : 255;
        const b = x < width ? img[idx + 2] : 255;
        const a = x < width ? img[idx + 3] : 255;
        const lum = (r * 0.299 + g * 0.587 + b * 0.114) * (a / 255);
        const isBlack = lum < 180;
        if (isBlack) byte |= 0x80 >> bit;
      }
      out[y * widthBytes + xb] = byte;
    }
  }
  return out;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

/* ─────────────────── ReceiptPayload (簡易レシート) ─────────────────── */

export function makeReceiptCanvas(payload: ReceiptPayload, widthPx: number = 576): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvasが利用できません');

  const padX = 24;
  const yGap = 8;
  const fontStore = 36;
  const fontTable = 24;
  const fontTitle = 22;
  const fontNormal = 20;
  const fontSmall = 18;

  const footerLines = [payload.footerAddress, payload.footerPhone].filter(Boolean).length;
  const h =
    50 +
    (fontStore + yGap) +
    (fontTable + yGap) +
    (fontTitle + yGap) +
    16 +
    payload.lines.length * (fontNormal + yGap) +
    16 +
    (fontStore + yGap) +
    (fontSmall + yGap) +
    (footerLines + 1) * (fontSmall + yGap) +
    60;

  canvas.width = widthPx;
  canvas.height = Math.max(200, h);

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000';

  let y = 46;
  const cx = canvas.width / 2;

  ctx.textAlign = 'center';
  ctx.font = `bold ${fontStore}px sans-serif`;
  ctx.fillText(payload.storeName || 'STORE', cx, y);
  y += fontStore + yGap;

  ctx.font = `bold ${fontTable}px sans-serif`;
  ctx.fillText(payload.tableName, cx, y);
  y += fontTable + yGap;

  ctx.font = `bold ${fontTitle}px sans-serif`;
  ctx.fillText(`【 ${payload.title} 】`, cx, y);
  y += fontTitle + yGap + 4;

  drawDashedLine(ctx, padX, canvas.width - padX, y);
  y += 14;

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

  drawDashedLine(ctx, padX, canvas.width - padX, y);
  y += 16;

  ctx.font = `bold ${fontStore}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText(payload.totalLabel, padX, y);
  ctx.textAlign = 'right';
  ctx.fillText(formatAmountEn(payload.totalAmount), canvas.width - padX, y);
  y += fontStore + yGap + 8;

  ctx.textAlign = 'center';
  ctx.font = `${fontSmall}px sans-serif`;
  ctx.fillText(`発行: ${formatIssuedAt(payload.issuedAt)}`, cx, y);
  y += fontSmall + yGap;
  if (payload.footerAddress?.trim()) {
    ctx.fillText(payload.footerAddress.trim(), cx, y);
    y += fontSmall + yGap;
  }
  if (payload.footerPhone?.trim()) {
    ctx.fillText(`TEL:${payload.footerPhone.trim()}`, cx, y);
  }

  return canvas;
}

/* ─────────────────── FullReceiptPayload (領収書) ─────────────────── */

export function makeFullReceiptCanvas(payload: FullReceiptPayload, widthPx: number = 576): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvasが利用できません');

  const padX = 24;
  const yGap = 6;
  const fontStore = 56;
  const fontTableNum = 28;
  const fontGreeting = 20;
  const fontInfo = 18;
  const fontItemHeader = 18;
  const fontItem = 20;
  const fontSubtotal = 20;
  const fontTotal = 32;
  const fontBottom = 17;
  const lineH = fontItem + yGap;

  const qtyRight = widthPx - padX - 100;
  const amtRight = widthPx - padX;

  const greetingLines = (payload.greeting || '').split(/\r?\n/).filter(Boolean);

  const bottomLines: string[] = [];
  const idPayment: string[] = [];
  // if (payload.storeId) idPayment.push(`ID:${payload.storeId}`);
  if (payload.paymentMethod) idPayment.push(`支払方法:${payload.paymentMethod}`);
  if (idPayment.length) bottomLines.push(idPayment.join('  '));
  const timeGuest: string[] = [];
  if (payload.startTime) timeGuest.push(`開始時間:${payload.startTime}`);
  if (payload.guestCount) timeGuest.push(`人数: ${payload.guestCount}`);
  if (timeGuest.length) bottomLines.push(timeGuest.join('  '));
  if (payload.nomineeNames?.trim()) bottomLines.push(`指名:${payload.nomineeNames.trim()}`);

  const h =
    56 +
    (fontStore + 10) +
    (fontTableNum + 10) +
    greetingLines.length * (fontGreeting + yGap) + 6 +
    (payload.storeAddress?.trim() ? (fontInfo + yGap) : 0) +
    (payload.storePhone?.trim() ? (fontInfo + yGap) : 0) +
    (payload.paymentId ? (fontInfo + yGap) : 0) +
    12 +
    (fontItemHeader + yGap) + 4 +
    payload.orderLines.length * lineH +
    14 +
    (fontSubtotal + yGap) * 2 +
    18 +
    (fontTotal + 12) +
    (fontInfo + yGap) +
    14 +
    bottomLines.length * (fontBottom + yGap) +
    50;

  canvas.width = widthPx;
  canvas.height = Math.max(400, h);

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000';

  const cx = canvas.width / 2;
  let y = 50;

  ctx.textAlign = 'center';
  ctx.font = `bold ${fontStore}px sans-serif`;
  ctx.fillText(payload.storeName || 'STORE', cx, y);
  y += fontStore + 10;

  ctx.font = `bold ${fontTableNum}px sans-serif`;
  ctx.fillText(`【 ${payload.tableNumber} 】`, cx, y);
  y += fontTableNum + 10;

  ctx.font = `${fontGreeting}px sans-serif`;
  for (const line of greetingLines) {
    ctx.fillText(line.trim(), cx, y);
    y += fontGreeting + yGap;
  }

  if (payload.storeAddress?.trim() || payload.storePhone?.trim() || payload.paymentId) {
    y += 4;
    ctx.font = `${fontInfo}px sans-serif`;
    if (payload.storeAddress?.trim()) {
      ctx.fillText(payload.storeAddress.trim(), cx, y);
      y += fontInfo + yGap;
    }
    if (payload.storePhone?.trim()) {
      ctx.fillText(`TEL:${payload.storePhone.trim()}`, cx, y);
      y += fontInfo + yGap;
    }
    if (payload.paymentId) {
      ctx.textAlign = 'left';
      ctx.fillText(`登録番号:${payload.paymentId}`, padX, y);
      ctx.textAlign = 'center';
      y += fontInfo + yGap;
    }
  }
  y += 6;

  y += 12;

  ctx.font = `bold ${fontItemHeader}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText('項目', padX, y);
  ctx.textAlign = 'right';
  ctx.fillText('数量', qtyRight, y);
  ctx.fillText('金額', amtRight, y);
  y += fontItemHeader + yGap;

  ctx.font = `${fontItem}px sans-serif`;
  for (const row of payload.orderLines) {
    ctx.textAlign = 'left';
    ctx.fillText(truncate(row.item, 14), padX, y);
    ctx.textAlign = 'right';
    ctx.fillText(String(row.qty), qtyRight, y);
    ctx.fillText(formatAmountPlain(row.amount), amtRight, y);
    y += lineH;
  }
  y += 4;

  drawDashedLine(ctx, padX, canvas.width - padX, y);
  y += 14;

  ctx.font = `${fontSubtotal}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText('小　計', padX, y);
  ctx.textAlign = 'right';
  ctx.fillText(formatAmountEn(payload.subtotal), amtRight, y);
  y += fontSubtotal + yGap;

  ctx.textAlign = 'left';
  ctx.fillText('SC TAX', padX, y);
  ctx.textAlign = 'right';
  ctx.fillText(formatAmountEn(payload.tax), amtRight, y);
  y += fontSubtotal + 16;

  ctx.font = `bold ${fontTotal}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText('合　計', padX, y);
  ctx.textAlign = 'right';
  ctx.fillText(formatAmountEn(payload.total), amtRight, y);
  y += fontTotal + 12;

  if (payload.taxDetailText) {
    ctx.font = `${fontInfo}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(payload.taxDetailText, cx, y);
    y += fontInfo + yGap;
  }
  y += 8;

  ctx.font = `${fontBottom}px sans-serif`;
  ctx.textAlign = 'center';
  for (const bl of bottomLines) {
    ctx.fillText(bl, cx, y);
    y += fontBottom + yGap;
  }

  return canvas;
}

/* ─────────────────── ESC/POS raster builders ─────────────────── */

export function buildEscPosRasterReceipt(payload: ReceiptPayload, opts?: { widthPx?: number }): Uint8Array {
  const widthPx = opts?.widthPx ?? 576;
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

/* ─────────────── ExtensionInfoReceiptPayload (現在料金 / 延長料金) ─────────────── */

export function makeExtensionInfoReceiptCanvas(
  payload: ExtensionInfoReceiptPayload,
  widthPx: number = 576
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvasが利用できません');

  const padX = 28;
  const fontStore = 64;
  const fontTableNum = 30;
  const fontSection = 22;
  const fontAmount = 60;
  const fontPerPerson = 18;
  const fontFooter = 18;

  const gapAfterStore = 18;
  const gapAfterTable = 28;
  const gapAroundDashed = 14;
  const gapAfterPer = 30;
  const gapBeforeFooter = 26;

  // Height estimation: store + table + topDashed + 2 sections (each: label, dashed,
  // amount, dashed, per) + (optional) footer.
  const sectionInnerH =
    fontSection + gapAroundDashed +
    1 + gapAroundDashed +
    fontAmount + gapAroundDashed +
    1 + gapAroundDashed +
    fontPerPerson + gapAfterPer;

  const h =
    56 +
    fontStore + gapAfterStore +
    fontTableNum + gapAfterTable +
    1 + gapAroundDashed +
    sectionInnerH +
    sectionInnerH +
    (payload.footerNote ? gapBeforeFooter + fontFooter : 0) +
    50;

  canvas.width = widthPx;
  canvas.height = Math.max(420, h);

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000';

  const cx = canvas.width / 2;
  let y = 60;

  ctx.textAlign = 'center';
  ctx.font = `bold ${fontStore}px sans-serif`;
  ctx.fillText(payload.storeName || 'STORE', cx, y);
  y += gapAfterStore + Math.round(fontStore * 0.4);

  ctx.font = `bold ${fontTableNum}px sans-serif`;
  ctx.fillText(`【 ${payload.tableNumber} 】`, cx, y);
  y += gapAfterTable;

  // Top dashed separator (only above the first section).
  drawDashedLine(ctx, padX, canvas.width - padX, y);
  y += gapAroundDashed;

  const drawSection = (label: string, total: number, perPerson: number, remainder: number) => {
    ctx.font = `${fontSection}px sans-serif`;
    ctx.fillText(`【${label}】`, cx, y + fontSection - 4);
    y += fontSection + gapAroundDashed;

    drawDashedLine(ctx, padX, canvas.width - padX, y);
    y += gapAroundDashed;

    ctx.font = `${fontAmount}px sans-serif`;
    ctx.fillText(`${formatYen(total)}-`, cx, y + fontAmount - 8);
    y += fontAmount + gapAroundDashed;

    drawDashedLine(ctx, padX, canvas.width - padX, y);
    y += gapAroundDashed;

    ctx.font = `${fontPerPerson}px sans-serif`;
    ctx.fillText(
      `(お一人様 ${formatYen(perPerson)}) (余り ${formatYen(remainder)})`,
      cx,
      y + fontPerPerson - 4
    );
    y += fontPerPerson + gapAfterPer;
  };

  drawSection(
    payload.currentLabel || '現在料金',
    payload.currentTotal,
    payload.currentPerPerson,
    payload.currentRemainder
  );

  drawSection(
    payload.extensionLabel || '延長料金',
    payload.extensionTotal,
    payload.extensionPerPerson,
    payload.extensionRemainder
  );

  if (payload.footerNote?.trim()) {
    y += gapBeforeFooter - gapAfterPer;
    ctx.font = `${fontFooter}px sans-serif`;
    ctx.fillText(payload.footerNote.trim(), cx, y + fontFooter - 4);
  }

  return canvas;
}

export function buildExtensionInfoReceiptEscPos(
  payload: ExtensionInfoReceiptPayload,
  opts?: { widthPx?: number }
): Uint8Array {
  const widthPx = opts?.widthPx ?? 576;
  const canvas = makeExtensionInfoReceiptCanvas(payload, widthPx);
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
