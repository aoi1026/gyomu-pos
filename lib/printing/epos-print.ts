'use client';

import type { ReceiptPayload, FullReceiptPayload } from '@/lib/printing/escpos-raster';

const EPOS_PORT = 8008;
const EPOS_SDK_URL = '/epos/epos-2.27.0.js';

function formatYen(amount: number): string {
  const n = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `¥${n.toLocaleString('ja-JP')}`;
}

function formatIssuedAt(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd} ${hh}:${mi}`;
}

/** Epson ePOS SDK を読み込み、利用可能にする */
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
      const check = () => {
        if ((window as any).epson?.ePOSDevice) resolve();
        else setTimeout(check, 100);
      };
      check();
      return;
    }
    const script = document.createElement('script');
    script.src = EPOS_SDK_URL;
    script.async = false;
    script.onload = () => {
      if ((window as any).epson?.ePOSDevice) resolve();
      else reject(new Error('Epson ePOS SDK の読み込みに失敗しました'));
    };
    script.onerror = () =>
      reject(
        new Error(
          'Epson ePOS SDK を読み込めません。public/epos/epos-2.27.0.js を配置してください。'
        )
      );
    document.head.appendChild(script);
  });
}

type EpsonBuilder = {
  FONT_A: string;
  ALIGN_CENTER: string;
  ALIGN_LEFT: string;
  ALIGN_RIGHT: string;
  CUT_FEED: string;
  addText(text: string): void;
  addTextAlign(align: string): void;
  addFeed(): void;
  addCut(type: string): void;
  send(id?: string): void;
};

/** ReceiptPayload を ePOS ビルダーで印刷 */
function buildReceiptOnBuilder(builder: EpsonBuilder, payload: ReceiptPayload): void {
  builder.addTextAlign(builder.ALIGN_CENTER);
  builder.addText(`${payload.storeName || 'STORE'}\n`);
  builder.addText(`${payload.tableName}\n`);
  builder.addText(`【${payload.title}】\n`);
  builder.addText('-'.repeat(24) + '\n');

  builder.addTextAlign(builder.ALIGN_LEFT);
  for (const line of payload.lines) {
    const left = line.left ?? '';
    const right = line.right ?? '';
    if (right) {
      const pad = 24 - (left.length + right.length);
      builder.addText(left + (pad > 0 ? ' '.repeat(pad) : ' ') + right + '\n');
    } else {
      builder.addText(left + '\n');
    }
  }

  builder.addText('-'.repeat(24) + '\n');
  builder.addText(
    `${payload.totalLabel}${' '.repeat(Math.max(0, 16 - payload.totalLabel.length))}${formatYen(payload.totalAmount)}\n`
  );
  builder.addTextAlign(builder.ALIGN_CENTER);
  builder.addText(`発行: ${formatIssuedAt(payload.issuedAt)}\n`);
  if (payload.footerAddress?.trim()) {
    builder.addText(`住所: ${payload.footerAddress.trim()}\n`);
  }
  if (payload.footerPhone?.trim()) {
    builder.addText(`電話番号: ${payload.footerPhone.trim()}\n`);
  }
  builder.addFeed();
  builder.addFeed();
  builder.addCut(builder.CUT_FEED);
}

/** FullReceiptPayload を ePOS ビルダーで印刷 */
function buildFullReceiptOnBuilder(builder: EpsonBuilder, payload: FullReceiptPayload): void {
  builder.addTextAlign(builder.ALIGN_CENTER);
  builder.addText(`${payload.storeName || 'STORE'}\n`);
  builder.addText(`【${payload.tableNumber}】\n`);
  if (payload.greeting?.trim()) {
    builder.addText(payload.greeting.trim().replace(/\n/g, '\n') + '\n');
  }
  if (payload.storeAddress?.trim() || payload.storePhone?.trim()) {
    builder.addTextAlign(builder.ALIGN_LEFT);
    if (payload.storeAddress?.trim()) builder.addText(`${payload.storeAddress.trim()}\n`);
    if (payload.storePhone?.trim()) builder.addText(`TEL:${payload.storePhone.trim()}\n`);
    if (payload.paymentId) builder.addText(`登録番号:${payload.paymentId}\n`);
    builder.addTextAlign(builder.ALIGN_CENTER);
  }

  builder.addText('--- 注文明細 ---\n');
  builder.addTextAlign(builder.ALIGN_LEFT);
  builder.addText('項目'.padEnd(20) + '数量'.padStart(6) + '金額'.padStart(10) + '\n');
  for (const row of payload.orderLines) {
    const item = row.item.slice(0, 18).padEnd(20);
    const qty = String(row.qty).padStart(6);
    const amt = formatYen(row.amount).padStart(10);
    builder.addText(`${item}${qty}${amt}\n`);
  }
  builder.addText('-'.repeat(24) + '\n');
  builder.addText(`小計${' '.repeat(18)}${formatYen(payload.subtotal)}\n`);
  builder.addText(`SC TAX${' '.repeat(16)}${formatYen(payload.tax)}\n`);
  builder.addText('-'.repeat(24) + '\n');
  builder.addText(`合計${' '.repeat(18)}${formatYen(payload.total)}-\n`);
  if (payload.taxDetailText) builder.addText(`${payload.taxDetailText}\n`);
  if (payload.storeId) builder.addText(`ID:${payload.storeId}\n`);
  if (payload.paymentMethod) builder.addText(`支払方法:${payload.paymentMethod}\n`);
  if (payload.startTime) builder.addText(`開台時間:${payload.startTime}\n`);
  if (payload.guestCount) builder.addText(`開台人数:${payload.guestCount}\n`);
  builder.addFeed();
  builder.addFeed();
  builder.addCut(builder.CUT_FEED);
}

/** ePOS で印刷（Epson SDK を直接使用、Promise でラップ） */
async function printViaEpos(
  ip: string,
  execute: (builder: EpsonBuilder) => void
): Promise<void> {
  await loadEpsonSdk();
  const epson = (window as any).epson;
  if (!epson?.ePOSDevice) {
    throw new Error('Epson ePOS SDK が利用できません');
  }

  return new Promise((resolve, reject) => {
    const ePosDev = new epson.ePOSDevice();
    const port = EPOS_PORT;

    ePosDev.connect(ip, port, (result: string) => {
      if (result === 'OK' || result === 'SSL_CONNECT_OK') {
        ePosDev.createDevice(
          'local_printer',
          ePosDev.DEVICE_TYPE_PRINTER,
          { crypto: false, buffer: false },
          (devobj: EpsonBuilder, retcode: string) => {
            if (retcode === 'OK') {
              try {
                execute(devobj);
                devobj.send();
                resolve();
              } catch (e) {
                reject(e);
              }
            } else {
              reject(new Error(`プリンター接続エラー: ${retcode}`));
            }
          }
        );
      } else {
        reject(new Error(`プリンター接続失敗: ${result}`));
      }
    });
  });
}

/** ReceiptPayload を ePOS で印刷（iPad からプリンターへ直接 Wi-Fi） */
export async function printReceiptViaEpos(ip: string, payload: ReceiptPayload): Promise<void> {
  await printViaEpos(ip, (builder) => buildReceiptOnBuilder(builder, payload));
}

/** FullReceiptPayload を ePOS で印刷 */
export async function printFullReceiptViaEpos(ip: string, payload: FullReceiptPayload): Promise<void> {
  await printViaEpos(ip, (builder) => buildFullReceiptOnBuilder(builder, payload));
}

/** 複数 ReceiptPayload を ePOS で印刷 */
export async function printReceiptsViaEpos(
  ip: string,
  payloads: ReceiptPayload[]
): Promise<void> {
  for (const p of payloads) {
    await printViaEpos(ip, (builder) => buildReceiptOnBuilder(builder, p));
  }
}

/** ePOS 接続テスト（プリンターのポート 8008 に接続試行） */
export async function testEposConnection(ip: string): Promise<{ ok: boolean; message: string }> {
  try {
    await loadEpsonSdk();
    const epson = (window as any).epson;
    if (!epson?.ePOSDevice) {
      return { ok: false, message: 'Epson ePOS SDK が利用できません' };
    }

    return new Promise((resolve) => {
      const ePosDev = new epson.ePOSDevice();
      const timeout = setTimeout(() => {
        resolve({ ok: false, message: '接続がタイムアウトしました（60秒）' });
      }, 60000);

      ePosDev.connect(ip, EPOS_PORT, (result: string) => {
        clearTimeout(timeout);
        if (result === 'OK' || result === 'SSL_CONNECT_OK') {
          ePosDev.disconnect();
          resolve({ ok: true, message: `接続成功 (${ip}:${EPOS_PORT})` });
        } else {
          resolve({ ok: false, message: `接続失敗: ${result}` });
        }
      });
    });
  } catch (e: any) {
    return { ok: false, message: e?.message || '接続テストに失敗しました' };
  }
}
