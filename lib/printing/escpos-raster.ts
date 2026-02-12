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

function makeReceiptCanvas(payload: ReceiptPayload, widthPx: number): HTMLCanvasElement {
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

export { formatYen };

