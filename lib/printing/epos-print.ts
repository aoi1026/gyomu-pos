'use client';

import type { ReceiptPayload, FullReceiptPayload, ExtensionInfoReceiptPayload } from '@/lib/printing/escpos-raster';
import { charWidth, truncateToWidth, leftRight } from '@/lib/printing/escpos-text';

const EPOS_SDK_URL = '/epos/epos-2.27.0.js';
const COL_WIDTH = 42;
const COL_WIDTH_WIDE = Math.floor(COL_WIDTH / 2);

export function loadEpsonSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('ブラウザ環境で実行してください'));
      return;
    }
    const epson = (window as any).epson;
    if (epson?.ePOSDevice) {
      resolve();
      return;
    }
    const existing = document.querySelector(`script[src="${EPOS_SDK_URL}"]`);
    if (existing) {
      const check = (attempts = 0) => {
        if ((window as any).epson?.ePOSDevice) resolve();
        else if (attempts > 50) reject(new Error('Epson ePOS SDK の読み込みがタイムアウトしました'));
        else setTimeout(() => check(attempts + 1), 100);
      };
      check();
      return;
    }
    const script = document.createElement('script');
    script.src = EPOS_SDK_URL;
    script.async = false;
    script.onload = () => {
      const check = (attempts = 0) => {
        if ((window as any).epson?.ePOSDevice) resolve();
        else if (attempts > 30) reject(new Error('Epson ePOS SDK のロード後に初期化されませんでした'));
        else setTimeout(() => check(attempts + 1), 100);
      };
      check();
    };
    script.onerror = () =>
      reject(new Error('Epson ePOS SDK を読み込めません。public/epos/epos-2.27.0.js を確認してください。'));
    document.head.appendChild(script);
  });
}

type EposPrinterDevice = {
  ALIGN_LEFT: number;
  ALIGN_CENTER: number;
  ALIGN_RIGHT: number;
  COLOR_1: string;
  MODE_MONO: string;
  CUT_FEED: string;
  FONT_A: string;
  LANG_JA: string;
  timeout: number;
  onreceive: ((res: { success: boolean; code: string; status: number }) => void) | null;
  onerror: ((err: any) => void) | null;
  addTextAlign(align: number): void;
  addTextSize(width: number, height: number): void;
  addTextStyle(reverse: boolean, ul: boolean, em: boolean, color: string): void;
  addTextFont?(font: string): void;
  addTextLang?(lang: string): void;
  addText(data: string): void;
  addImage(
    context: CanvasRenderingContext2D,
    x: number, y: number,
    width: number, height: number,
    color?: string, mode?: string
  ): void;
  addFeedLine(lines: number): void;
  addCut(type: string): void;
  send(): void;
};

function tryConnect(
  epson: any, ip: string, port: number, timeoutMs: number
): Promise<{ ok: true; ePosDev: any } | { ok: false; error: string }> {
  return new Promise((resolve) => {
    const ePosDev = new epson.ePOSDevice();
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      try { ePosDev.disconnect(); } catch {}
      resolve({ ok: false, error: `TIMEOUT on port ${port}` });
    }, timeoutMs);

    ePosDev.connect(ip, port, (result: string) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (result === 'OK' || result === 'SSL_CONNECT_OK') {
        resolve({ ok: true, ePosDev });
      } else {
        try { ePosDev.disconnect(); } catch {}
        resolve({ ok: false, error: `${result} on port ${port}` });
      }
    });
  });
}

async function connectToPrinter(
  epson: any, ip: string
): Promise<{ ok: true; ePosDev: any; port: number } | { ok: false; errors: string[] }> {
  const errors: string[] = [];
  const r1 = await tryConnect(epson, ip, 8008, 15000);
  if (r1.ok) return { ok: true, ePosDev: r1.ePosDev, port: 8008 };
  errors.push(r1.error);
  const r2 = await tryConnect(epson, ip, 8043, 15000);
  if (r2.ok) return { ok: true, ePosDev: r2.ePosDev, port: 8043 };
  errors.push(r2.error);
  return { ok: false, errors };
}

function buildConnectionErrorMessage(ip: string, errors: string[]): string {
  return [
    `プリンター接続に失敗しました (${ip})`,
    `\n試行結果:`,
    ...errors.map((e, i) => `  ${i + 1}. ${e}`),
    `\n確認事項:`,
    `• プリンターの電源が入っているか`,
    `• iPadとプリンターが同じWi-Fiネットワークに接続されているか`,
    `• プリンター設定画面で ePOS-Print が「Enable」になっているか`,
    `• プリンターIPアドレス (${ip}) が正しいか`,
  ].join('\n');
}

function fmtPlain(amount: number): string {
  const n = Number.isFinite(amount) ? Math.round(amount) : 0;
  return n.toLocaleString('ja-JP');
}

function fmtEn(amount: number): string {
  return `${fmtPlain(amount)}円`;
}

// ---------------------------------------------------------------------------
// Build print commands using ePOS SDK text API (not raster)
// ---------------------------------------------------------------------------

function buildFullReceiptText(p: EposPrinterDevice, payload: FullReceiptPayload): void {
  if (typeof p.addTextLang === 'function') p.addTextLang(p.LANG_JA || 'ja');
  if (typeof p.addTextFont === 'function') p.addTextFont(p.FONT_A || 'font_a');

  // Store name (3×3 – matches original receipt)
  p.addTextAlign(p.ALIGN_CENTER);
  p.addTextSize(3, 3);
  p.addTextStyle(false, false, true, p.COLOR_1);
  p.addText((payload.storeName || 'STORE') + '\n');

  // Table number
  p.addTextSize(2, 1);
  p.addText(`【 ${payload.tableNumber} 】\n`);
  p.addTextSize(1, 1);
  p.addTextStyle(false, false, false, p.COLOR_1);

  // Greeting
  const greetingLines = (payload.greeting || '').split(/\r?\n/).filter(Boolean);
  for (const gl of greetingLines) p.addText(gl.trim() + '\n');

  // Store info
  if (payload.storeAddress?.trim()) p.addText(payload.storeAddress.trim() + '\n');
  if (payload.storePhone?.trim()) p.addText(`TEL:${payload.storePhone.trim()}\n`);

  // Registration number
  if (payload.paymentId) {
    p.addTextAlign(p.ALIGN_LEFT);
    p.addText(`登録番号:${payload.paymentId}\n`);
    p.addTextAlign(p.ALIGN_CENTER);
  }

  p.addText('\n');

  // Item header
  p.addTextAlign(p.ALIGN_LEFT);
  p.addText(leftRight('項目', '数量    金額', COL_WIDTH) + '\n');

  // Order lines
  for (const row of payload.orderLines) {
    const maxW = 20;
    const itemName = charWidth(row.item) > maxW ? truncateToWidth(row.item, maxW) : row.item;
    const qtyStr = String(row.qty).padStart(4);
    const amtStr = fmtPlain(row.amount).padStart(8);
    p.addText(leftRight(itemName, qtyStr + amtStr, COL_WIDTH) + '\n');
  }

  // Dashed line – only between items and subtotal
  p.addText('-'.repeat(COL_WIDTH) + '\n');

  // Subtotal & tax
  p.addText(leftRight('小　計', fmtEn(payload.subtotal), COL_WIDTH) + '\n');
  p.addText(leftRight('SC TAX', fmtEn(payload.tax), COL_WIDTH) + '\n');
  p.addText('\n');

  // Total
  p.addTextSize(2, 1);
  p.addTextStyle(false, false, true, p.COLOR_1);
  p.addText(leftRight('合　計', fmtEn(payload.total), COL_WIDTH_WIDE) + '\n');
  p.addTextSize(1, 1);
  p.addTextStyle(false, false, false, p.COLOR_1);
  p.addText('\n');

  // Tax detail
  if (payload.taxDetailText) {
    p.addTextAlign(p.ALIGN_CENTER);
    p.addText(payload.taxDetailText + '\n');
  }
  p.addText('\n');

  // Footer
  p.addTextAlign(p.ALIGN_CENTER);
  const idPayment: string[] = [];
  // if (payload.storeId) idPayment.push(`ID:${payload.storeId}`);
  if (payload.paymentMethod) idPayment.push(`支払方法:${payload.paymentMethod}`);
  if (idPayment.length) p.addText(idPayment.join('  ') + '\n');

  const timeGuest: string[] = [];
  if (payload.startTime) timeGuest.push(`開始時間:${payload.startTime}`);
  if (payload.guestCount) timeGuest.push(`人数:${payload.guestCount}`);
  if (timeGuest.length) p.addText(timeGuest.join('  ') + '\n');

  if (payload.nomineeNames?.trim()) p.addText(`指名:${payload.nomineeNames.trim()}\n`);

  p.addFeedLine(3);
  p.addCut(p.CUT_FEED);
}

function buildExtensionInfoReceiptText(p: EposPrinterDevice, payload: ExtensionInfoReceiptPayload): void {
  if (typeof p.addTextLang === 'function') p.addTextLang(p.LANG_JA || 'ja');
  if (typeof p.addTextFont === 'function') p.addTextFont(p.FONT_A || 'font_a');

  // Store name (3×3)
  p.addTextAlign(p.ALIGN_CENTER);
  p.addTextSize(3, 3);
  p.addTextStyle(false, false, true, p.COLOR_1);
  p.addText((payload.storeName || 'STORE') + '\n');
  p.addTextSize(1, 1);
  p.addTextStyle(false, false, false, p.COLOR_1);

  // Table number (2×1)
  p.addTextSize(2, 1);
  p.addText(`【 ${payload.tableNumber} 】\n`);
  p.addTextSize(1, 1);
  p.addText('\n');

  // Top dashed separator (above the first section only)
  p.addTextAlign(p.ALIGN_LEFT);
  p.addText('-'.repeat(COL_WIDTH) + '\n');

  const drawSection = (label: string, total: number, perPerson: number, remainder: number) => {
    p.addTextAlign(p.ALIGN_CENTER);
    p.addText(`【${label}】\n`);

    p.addTextAlign(p.ALIGN_LEFT);
    p.addText('-'.repeat(COL_WIDTH) + '\n');

    p.addTextAlign(p.ALIGN_CENTER);
    p.addTextSize(3, 3);
    p.addTextStyle(false, false, true, p.COLOR_1);
    p.addText(`${fmtPlain(total)}-\n`);
    p.addTextSize(1, 1);
    p.addTextStyle(false, false, false, p.COLOR_1);

    p.addTextAlign(p.ALIGN_LEFT);
    p.addText('-'.repeat(COL_WIDTH) + '\n');

    p.addTextAlign(p.ALIGN_CENTER);
    p.addText(`(お一人様 ${fmtPlain(perPerson)}円) (余り ${fmtPlain(remainder)}円)\n`);
    p.addText('\n');
  };

  drawSection(
    payload.currentLabel || '現在料金',
    payload.currentTotal,
    payload.currentPerPerson,
    payload.currentRemainder,
  );

  drawSection(
    payload.extensionLabel || '延長料金',
    payload.extensionTotal,
    payload.extensionPerPerson,
    payload.extensionRemainder,
  );

  if (payload.footerNote?.trim()) {
    p.addTextAlign(p.ALIGN_CENTER);
    p.addText(payload.footerNote.trim() + '\n');
  }

  p.addFeedLine(3);
  p.addCut(p.CUT_FEED);
}

function buildSimpleReceiptText(p: EposPrinterDevice, payload: ReceiptPayload): void {
  if (typeof p.addTextLang === 'function') p.addTextLang(p.LANG_JA || 'ja');
  if (typeof p.addTextFont === 'function') p.addTextFont(p.FONT_A || 'font_a');

  p.addTextAlign(p.ALIGN_CENTER);
  p.addTextSize(3, 3);
  p.addTextStyle(false, false, true, p.COLOR_1);
  p.addText((payload.storeName || 'STORE') + '\n');

  p.addTextSize(2, 1);
  p.addText(payload.tableName + '\n');
  p.addTextSize(1, 1);
  p.addTextStyle(false, false, false, p.COLOR_1);

  p.addTextStyle(false, false, true, p.COLOR_1);
  p.addText(`【 ${payload.title} 】\n`);
  p.addTextStyle(false, false, false, p.COLOR_1);
  p.addText('\n');

  p.addTextAlign(p.ALIGN_LEFT);
  for (const ln of payload.lines) {
    if (ln.right) {
      p.addText(leftRight(ln.left, ln.right, COL_WIDTH) + '\n');
    } else {
      p.addText(ln.left + '\n');
    }
  }

  p.addText('-'.repeat(COL_WIDTH) + '\n');

  p.addTextSize(2, 1);
  p.addTextStyle(false, false, true, p.COLOR_1);
  p.addText(leftRight(payload.totalLabel, fmtEn(payload.totalAmount), COL_WIDTH_WIDE) + '\n');
  p.addTextSize(1, 1);
  p.addTextStyle(false, false, false, p.COLOR_1);
  p.addText('\n');

  p.addTextAlign(p.ALIGN_CENTER);
  const d = payload.issuedAt;
  const ts = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  p.addText(`発行: ${ts}\n`);

  if (payload.footerAddress?.trim()) p.addText(payload.footerAddress.trim() + '\n');
  if (payload.footerPhone?.trim()) p.addText(`TEL:${payload.footerPhone.trim()}\n`);

  p.addFeedLine(3);
  p.addCut(p.CUT_FEED);
}

// ---------------------------------------------------------------------------
// Connect to printer and send text-based receipt
// ---------------------------------------------------------------------------

async function connectAndPrintWithBuilder(
  ip: string,
  buildFn: (printer: EposPrinterDevice) => void,
): Promise<{ success: boolean; detail: string }> {
  await loadEpsonSdk();
  const epson = (window as any).epson;
  if (!epson?.ePOSDevice) {
    return { success: false, detail: 'Epson ePOS SDK が利用できません' };
  }

  const conn = await connectToPrinter(epson, ip);
  if (!conn.ok) {
    return { success: false, detail: buildConnectionErrorMessage(ip, conn.errors) };
  }

  const { ePosDev } = conn;

  return new Promise((resolve) => {
    let resolved = false;
    const timer = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      try { ePosDev.disconnect(); } catch {}
      resolve({ success: false, detail: 'プリンターデバイス作成がタイムアウトしました（30秒）' });
    }, 30000);

    ePosDev.createDevice(
      'local_printer',
      ePosDev.DEVICE_TYPE_PRINTER,
      { crypto: false, buffer: false },
      (devobj: EposPrinterDevice | null, retcode: string) => {
        if (resolved) return;

        if (retcode === 'OK' && devobj) {
          devobj.timeout = 60000;

          devobj.onreceive = (res) => {
            if (resolved) return;
            resolved = true;
            clearTimeout(timer);
            try { ePosDev.deleteDevice(devobj, () => {}); } catch {}
            try { ePosDev.disconnect(); } catch {}
            if (res.success) {
              resolve({ success: true, detail: '正常に印刷されました' });
            } else {
              resolve({ success: false, detail: `印刷エラー (code: ${res.code}, status: ${res.status})` });
            }
          };

          devobj.onerror = (err: any) => {
            if (resolved) return;
            resolved = true;
            clearTimeout(timer);
            try { ePosDev.deleteDevice(devobj, () => {}); } catch {}
            try { ePosDev.disconnect(); } catch {}
            resolve({ success: false, detail: `印刷送信エラー: ${err?.message || err || '不明'}` });
          };

          try {
            buildFn(devobj);
            devobj.send();
          } catch (e: any) {
            if (resolved) return;
            resolved = true;
            clearTimeout(timer);
            try { ePosDev.disconnect(); } catch {}
            resolve({ success: false, detail: `印刷データ構築エラー: ${e?.message || '不明'}` });
          }
        } else {
          resolved = true;
          clearTimeout(timer);
          try { ePosDev.disconnect(); } catch {}
          resolve({
            success: false,
            detail: `プリンターデバイス作成失敗 (${retcode})。Device ID が "local_printer" であるか確認してください。`,
          });
        }
      }
    );
  });
}

export async function printReceiptViaEpos(ip: string, payload: ReceiptPayload): Promise<void> {
  const result = await connectAndPrintWithBuilder(ip, (p) => buildSimpleReceiptText(p, payload));
  if (!result.success) throw new Error(result.detail);
}

export async function printFullReceiptViaEpos(ip: string, payload: FullReceiptPayload): Promise<void> {
  const result = await connectAndPrintWithBuilder(ip, (p) => buildFullReceiptText(p, payload));
  if (!result.success) throw new Error(result.detail);
}

export async function printExtensionInfoReceiptViaEpos(
  ip: string,
  payload: ExtensionInfoReceiptPayload,
): Promise<void> {
  const result = await connectAndPrintWithBuilder(ip, (p) => buildExtensionInfoReceiptText(p, payload));
  if (!result.success) throw new Error(result.detail);
}

export async function printReceiptsViaEpos(ip: string, payloads: ReceiptPayload[]): Promise<void> {
  for (const pl of payloads) {
    await printReceiptViaEpos(ip, pl);
  }
}

export async function testEposConnection(ip: string): Promise<{ ok: boolean; message: string }> {
  try {
    await loadEpsonSdk();
  } catch (e: any) {
    return { ok: false, message: `SDK読み込みエラー: ${e?.message || '不明'}` };
  }
  const epson = (window as any).epson;
  if (!epson?.ePOSDevice) {
    return { ok: false, message: 'Epson ePOS SDK が利用できません' };
  }
  const conn = await connectToPrinter(epson, ip);
  if (!conn.ok) {
    return { ok: false, message: buildConnectionErrorMessage(ip, conn.errors) };
  }
  const { ePosDev, port } = conn;
  try { ePosDev.disconnect(); } catch {}
  return { ok: true, message: `正常に接続されました (${ip}:${port})` };
}
