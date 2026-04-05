'use client';

import type { FullReceiptPayload } from './escpos-raster';

// ---------------------------------------------------------------------------
// Shift-JIS encoder – built lazily from the browser's built-in TextDecoder
// ---------------------------------------------------------------------------

let sjisEncodeMap: Map<number, number> | null = null;

function getSjisEncodeMap(): Map<number, number> {
  if (sjisEncodeMap) return sjisEncodeMap;

  const decoder = new TextDecoder('shift_jis');
  const map = new Map<number, number>();

  for (let b = 0; b < 256; b++) {
    const char = decoder.decode(new Uint8Array([b]));
    if (char.length === 1 && char.codePointAt(0) !== 0xFFFD) {
      map.set(char.codePointAt(0)!, b);
    }
  }

  for (let high = 0x81; high <= 0xFC; high++) {
    if (high >= 0xA0 && high <= 0xDF) continue;
    for (let low = 0x40; low <= 0xFC; low++) {
      if (low === 0x7F) continue;
      const char = decoder.decode(new Uint8Array([high, low]));
      if (char.length === 1 && char.codePointAt(0) !== 0xFFFD) {
        map.set(char.codePointAt(0)!, (high << 8) | low);
      }
    }
  }

  sjisEncodeMap = map;
  return map;
}

function encodeShiftJIS(text: string): Uint8Array {
  const map = getSjisEncodeMap();
  const bytes: number[] = [];
  for (const char of text) {
    const cp = char.codePointAt(0)!;
    const sjis = map.get(cp);
    if (sjis !== undefined) {
      if (sjis > 0xFF) {
        bytes.push((sjis >> 8) & 0xFF, sjis & 0xFF);
      } else {
        bytes.push(sjis);
      }
    } else {
      bytes.push(0x3F);
    }
  }
  return new Uint8Array(bytes);
}

// ---------------------------------------------------------------------------
// ESC/POS command constants
// ---------------------------------------------------------------------------

const ESC = 0x1B;
const GS  = 0x1D;
const FS  = 0x1C;
const LF  = 0x0A;

const INIT       = [ESC, 0x40];
const KANJI_ON   = [FS, 0x26];
const KANJI_SJIS = [FS, 0x43, 0x02];

const ALIGN_LEFT   = [ESC, 0x61, 0x00];
const ALIGN_CENTER = [ESC, 0x61, 0x01];

const BOLD_ON  = [ESC, 0x45, 0x01];
const BOLD_OFF = [ESC, 0x45, 0x00];

const SIZE_NORMAL  = [GS, 0x21, 0x00];       // 1×1
const SIZE_XLARGE  = [GS, 0x21, 0x22];       // 3×3 (store name)
const SIZE_WIDE    = [GS, 0x21, 0x10];       // 2× width, 1× height

const CUT = [GS, 0x56, 0x00];

function feedLines(n: number): number[] {
  return [ESC, 0x64, Math.min(255, n)];
}

// 80 mm paper, Font A (12×24) ≈ 42 half-width columns
const COL_WIDTH      = 42;
const COL_WIDTH_WIDE = Math.floor(COL_WIDTH / 2);

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

export function charWidth(text: string): number {
  let cols = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (cp <= 0xFF || (cp >= 0xFF61 && cp <= 0xFF9F)) {
      cols += 1;
    } else {
      cols += 2;
    }
  }
  return cols;
}

export function truncateToWidth(text: string, maxWidth: number): string {
  let cols = 0;
  let result = '';
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    const w = (cp <= 0xFF || (cp >= 0xFF61 && cp <= 0xFF9F)) ? 1 : 2;
    if (cols + w > maxWidth - 1) {
      result += '…';
      break;
    }
    cols += w;
    result += ch;
  }
  return cols <= maxWidth ? text : result;
}

export function leftRight(
  left: string,
  right: string,
  width: number = COL_WIDTH,
): string {
  const leftW = charWidth(left);
  const rightW = charWidth(right);
  const space = Math.max(1, width - leftW - rightW);
  return left + ' '.repeat(space) + right;
}

function dashedLine(width: number = COL_WIDTH): string {
  return '-'.repeat(width);
}

function fmtPlain(amount: number): string {
  const n = Number.isFinite(amount) ? Math.round(amount) : 0;
  return n.toLocaleString('ja-JP');
}

function fmtEn(amount: number): string {
  return `${fmtPlain(amount)}円`;
}

// ---------------------------------------------------------------------------
// Byte builder helper
// ---------------------------------------------------------------------------

class EscPosBuilder {
  private parts: (number[] | Uint8Array)[] = [];

  push(...items: (number[] | Uint8Array)[]): this {
    this.parts.push(...items);
    return this;
  }

  text(s: string): this {
    this.parts.push(encodeShiftJIS(s));
    return this;
  }

  lf(): this {
    this.parts.push([LF]);
    return this;
  }

  line(s: string): this {
    return this.text(s).lf();
  }

  build(): Uint8Array {
    let totalLen = 0;
    for (const p of this.parts) totalLen += p.length;
    const result = new Uint8Array(totalLen);
    let offset = 0;
    for (const p of this.parts) {
      if (p instanceof Uint8Array) {
        result.set(p, offset);
      } else {
        result.set(new Uint8Array(p), offset);
      }
      offset += p.length;
    }
    return result;
  }
}

// ---------------------------------------------------------------------------
// Full receipt (領収書) – text-mode ESC/POS
// ---------------------------------------------------------------------------

export function buildFullReceiptTextEscPos(
  payload: FullReceiptPayload,
): Uint8Array {
  const b = new EscPosBuilder();

  b.push(INIT, KANJI_ON, KANJI_SJIS);

  // Store name (3×3 – matches original receipt)
  b.push(ALIGN_CENTER, SIZE_XLARGE, BOLD_ON);
  b.line(payload.storeName || 'STORE');
  b.push(SIZE_NORMAL, BOLD_OFF);

  // Table number
  b.push(ALIGN_CENTER, SIZE_WIDE, BOLD_ON);
  b.line(`【 ${payload.tableNumber} 】`);
  b.push(SIZE_NORMAL, BOLD_OFF);

  // Greeting
  b.push(ALIGN_CENTER);
  const greetingLines = (payload.greeting || '').split(/\r?\n/).filter(Boolean);
  for (const gl of greetingLines) {
    b.line(gl.trim());
  }

  // Store address & phone
  if (payload.storeAddress?.trim() || payload.storePhone?.trim()) {
    b.push(ALIGN_CENTER);
    if (payload.storeAddress?.trim()) b.line(payload.storeAddress.trim());
    if (payload.storePhone?.trim()) b.line(`TEL:${payload.storePhone.trim()}`);
  }

  // Registration number
  if (payload.paymentId) {
    b.push(ALIGN_LEFT);
    b.line(`登録番号:${payload.paymentId}`);
  }

  b.lf();

  // Item header
  b.push(ALIGN_LEFT);
  b.line(leftRight('項目', '数量    金額'));

  // Order lines
  for (const row of payload.orderLines) {
    const maxItemW = 20;
    const itemName =
      charWidth(row.item) > maxItemW
        ? truncateToWidth(row.item, maxItemW)
        : row.item;
    const qtyStr = String(row.qty).padStart(4);
    const amtStr = fmtPlain(row.amount).padStart(8);
    b.line(leftRight(itemName, qtyStr + amtStr));
  }

  // Dashed line – ONLY between item list and subtotal
  b.line(dashedLine());

  // Subtotal & tax
  b.push(ALIGN_LEFT);
  b.line(leftRight('小　計', fmtEn(payload.subtotal)));
  b.line(leftRight('SC TAX', fmtEn(payload.tax)));
  b.lf();

  // Total (double-width, bold)
  b.push(ALIGN_LEFT, SIZE_WIDE, BOLD_ON);
  b.line(leftRight('合　計', fmtEn(payload.total), COL_WIDTH_WIDE));
  b.push(SIZE_NORMAL, BOLD_OFF);
  b.lf();

  // Tax detail
  if (payload.taxDetailText) {
    b.push(ALIGN_CENTER);
    b.line(payload.taxDetailText);
  }
  b.lf();

  // Footer: ID, payment method, time, guests, cast names
  b.push(ALIGN_CENTER);
  const idPayment: string[] = [];
  if (payload.storeId) idPayment.push(`ID:${payload.storeId}`);
  if (payload.paymentMethod) idPayment.push(`支払方法:${payload.paymentMethod}`);
  if (idPayment.length) b.line(idPayment.join('  '));

  const timeGuest: string[] = [];
  if (payload.startTime) timeGuest.push(`開台時間:${payload.startTime}`);
  if (payload.guestCount) timeGuest.push(`開台人数:${payload.guestCount}`);
  if (timeGuest.length) b.line(timeGuest.join('  '));

  if (payload.nomineeNames?.trim()) {
    b.line(`指名:${payload.nomineeNames.trim()}`);
  }

  b.push(feedLines(4), CUT);

  return b.build();
}

// ---------------------------------------------------------------------------
// Simple receipt – text-mode ESC/POS
// ---------------------------------------------------------------------------

export function buildReceiptTextEscPos(
  payload: import('./escpos-raster').ReceiptPayload,
): Uint8Array {
  const b = new EscPosBuilder();

  b.push(INIT, KANJI_ON, KANJI_SJIS);

  // Store name (3×3)
  b.push(ALIGN_CENTER, SIZE_XLARGE, BOLD_ON);
  b.line(payload.storeName || 'STORE');
  b.push(SIZE_NORMAL, BOLD_OFF);

  // Table name
  b.push(ALIGN_CENTER, SIZE_WIDE, BOLD_ON);
  b.line(payload.tableName);
  b.push(SIZE_NORMAL, BOLD_OFF);

  // Title
  b.push(ALIGN_CENTER, BOLD_ON);
  b.line(`【 ${payload.title} 】`);
  b.push(BOLD_OFF);
  b.lf();

  // Lines
  b.push(ALIGN_LEFT);
  for (const ln of payload.lines) {
    if (ln.right) {
      b.line(leftRight(ln.left, ln.right));
    } else {
      b.line(ln.left);
    }
  }

  // Dashed line
  b.line(dashedLine());

  // Total
  b.push(ALIGN_LEFT, SIZE_WIDE, BOLD_ON);
  b.line(leftRight(payload.totalLabel, fmtEn(payload.totalAmount), COL_WIDTH_WIDE));
  b.push(SIZE_NORMAL, BOLD_OFF);
  b.lf();

  // Issued at
  b.push(ALIGN_CENTER);
  const d = payload.issuedAt;
  const ts = [
    d.getFullYear(),
    '/',
    String(d.getMonth() + 1).padStart(2, '0'),
    '/',
    String(d.getDate()).padStart(2, '0'),
    ' ',
    String(d.getHours()).padStart(2, '0'),
    ':',
    String(d.getMinutes()).padStart(2, '0'),
  ].join('');
  b.line(`発行: ${ts}`);

  if (payload.footerAddress?.trim()) b.line(payload.footerAddress.trim());
  if (payload.footerPhone?.trim()) b.line(`TEL:${payload.footerPhone.trim()}`);

  b.push(feedLines(4), CUT);

  return b.build();
}
