'use client';

import type { ReceiptPayload, FullReceiptPayload } from '@/lib/printing/escpos-raster';

const EPOS_SDK_URL = '/epos/epos-2.27.0.js';

function getEposPort(): number {
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return 8043;
  }
  return 8008;
}

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
      reject(
        new Error(
          'Epson ePOS SDK を読み込めません。public/epos/epos-2.27.0.js を確認してください。'
        )
      );
    document.head.appendChild(script);
  });
}

type EposPrinterDevice = {
  FONT_A: string;
  ALIGN_CENTER: string;
  ALIGN_LEFT: string;
  ALIGN_RIGHT: string;
  CUT_FEED: string;
  timeout: number;
  onreceive: ((res: { success: boolean; code: string; status: number }) => void) | null;
  onerror: ((err: any) => void) | null;
  addText(text: string): void;
  addTextAlign(align: string): void;
  addFeed(): void;
  addFeedLine(lines: number): void;
  addCut(type: string): void;
  send(): void;
};

function buildReceiptOnPrinter(printer: EposPrinterDevice, payload: ReceiptPayload): void {
  printer.addTextAlign(printer.ALIGN_CENTER);
  printer.addText(`${payload.storeName || 'STORE'}\n`);
  printer.addText(`${payload.tableName}\n`);
  printer.addText(`【${payload.title}】\n`);
  printer.addText('-'.repeat(24) + '\n');

  printer.addTextAlign(printer.ALIGN_LEFT);
  for (const line of payload.lines) {
    const left = line.left ?? '';
    const right = line.right ?? '';
    if (right) {
      const pad = 24 - (left.length + right.length);
      printer.addText(left + (pad > 0 ? ' '.repeat(pad) : ' ') + right + '\n');
    } else {
      printer.addText(left + '\n');
    }
  }

  printer.addText('-'.repeat(24) + '\n');
  printer.addText(
    `${payload.totalLabel}${' '.repeat(Math.max(0, 16 - payload.totalLabel.length))}${formatYen(payload.totalAmount)}\n`
  );
  printer.addTextAlign(printer.ALIGN_CENTER);
  printer.addText(`発行: ${formatIssuedAt(payload.issuedAt)}\n`);
  if (payload.footerAddress?.trim()) {
    printer.addText(`住所: ${payload.footerAddress.trim()}\n`);
  }
  if (payload.footerPhone?.trim()) {
    printer.addText(`電話番号: ${payload.footerPhone.trim()}\n`);
  }
  printer.addFeedLine(3);
  printer.addCut(printer.CUT_FEED);
}

function buildFullReceiptOnPrinter(printer: EposPrinterDevice, payload: FullReceiptPayload): void {
  printer.addTextAlign(printer.ALIGN_CENTER);
  printer.addText(`${payload.storeName || 'STORE'}\n`);
  printer.addText(`【${payload.tableNumber}】\n`);
  if (payload.greeting?.trim()) {
    const greetLines = payload.greeting.trim().split(/\r?\n/);
    for (const gl of greetLines) {
      printer.addText(gl + '\n');
    }
  }
  if (payload.storeAddress?.trim() || payload.storePhone?.trim()) {
    printer.addTextAlign(printer.ALIGN_LEFT);
    if (payload.storeAddress?.trim()) printer.addText(`${payload.storeAddress.trim()}\n`);
    if (payload.storePhone?.trim()) printer.addText(`TEL:${payload.storePhone.trim()}\n`);
    if (payload.paymentId) printer.addText(`登録番号:${payload.paymentId}\n`);
    printer.addTextAlign(printer.ALIGN_CENTER);
  }

  printer.addText('--- 注文明細 ---\n');
  printer.addTextAlign(printer.ALIGN_LEFT);
  for (const row of payload.orderLines) {
    const item = row.item.slice(0, 20);
    printer.addText(`${item} x${row.qty}  ${formatYen(row.amount)}\n`);
  }
  printer.addText('-'.repeat(24) + '\n');
  printer.addText(`小計  ${formatYen(payload.subtotal)}\n`);
  printer.addText(`SC TAX  ${formatYen(payload.tax)}\n`);
  printer.addText('-'.repeat(24) + '\n');
  printer.addText(`合計  ${formatYen(payload.total)}\n`);
  if (payload.taxDetailText) printer.addText(`${payload.taxDetailText}\n`);
  if (payload.storeId) printer.addText(`ID:${payload.storeId}\n`);
  if (payload.paymentMethod) printer.addText(`支払方法:${payload.paymentMethod}\n`);
  if (payload.startTime) printer.addText(`開台時間:${payload.startTime}\n`);
  if (payload.guestCount) printer.addText(`開台人数:${payload.guestCount}\n`);
  printer.addFeedLine(3);
  printer.addCut(printer.CUT_FEED);
}

function buildSslCertInstructions(ip: string, port: number): string {
  return [
    `\n\n【SSL証明書の信頼が必要です】`,
    `このサイトはHTTPSで動作しているため、プリンターとの安全な通信（WSS）が必要です。`,
    `\n以下の手順を実行してください：`,
    `1. iPadのSafariで https://${ip}:${port}/ を開く`,
    `2.「この接続ではプライバシーが保護されません」と表示される`,
    `3.「詳細を表示」→「このWebサイトを閲覧」をタップ`,
    `4. このページに戻って再度接続テストを実行`,
  ].join('\n');
}

async function connectAndPrint(
  ip: string,
  execute: (printer: EposPrinterDevice) => void
): Promise<{ success: boolean; detail: string }> {
  await loadEpsonSdk();
  const epson = (window as any).epson;
  if (!epson?.ePOSDevice) {
    return { success: false, detail: 'Epson ePOS SDK が利用できません' };
  }

  const port = getEposPort();
  const isSecure = port === 8043;

  return new Promise((resolve) => {
    const ePosDev = new epson.ePOSDevice();
    let resolved = false;

    const timer = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      try { ePosDev.disconnect(); } catch {}
      let msg = `接続がタイムアウトしました（30秒） [${isSecure ? 'wss' : 'ws'}://${ip}:${port}]`;
      if (isSecure) {
        msg += buildSslCertInstructions(ip, port);
      }
      resolve({ success: false, detail: msg });
    }, 30000);

    ePosDev.connect(ip, port, (connectResult: string) => {
      if (resolved) return;

      if (connectResult === 'OK' || connectResult === 'SSL_CONNECT_OK') {
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
                  resolve({
                    success: false,
                    detail: `印刷エラー (code: ${res.code}, status: ${res.status})`,
                  });
                }
              };

              devobj.onerror = (err: any) => {
                if (resolved) return;
                resolved = true;
                clearTimeout(timer);
                try { ePosDev.deleteDevice(devobj, () => {}); } catch {}
                try { ePosDev.disconnect(); } catch {}
                resolve({
                  success: false,
                  detail: `印刷送信エラー: ${err?.message || err || '不明'}`,
                });
              };

              try {
                execute(devobj);
                devobj.send();
              } catch (e: any) {
                if (resolved) return;
                resolved = true;
                clearTimeout(timer);
                try { ePosDev.disconnect(); } catch {}
                resolve({
                  success: false,
                  detail: `印刷データ構築エラー: ${e?.message || '不明'}`,
                });
              }
            } else {
              resolved = true;
              clearTimeout(timer);
              try { ePosDev.disconnect(); } catch {}
              resolve({
                success: false,
                detail: `プリンターデバイス作成失敗 (${retcode})。プリンター設定の Device ID が "local_printer" であるか確認してください。`,
              });
            }
          }
        );
      } else {
        resolved = true;
        clearTimeout(timer);
        let msg = `プリンター接続失敗 (${connectResult}) [${isSecure ? 'wss' : 'ws'}://${ip}:${port}]`;
        if (isSecure && (connectResult === 'ERROR' || connectResult === 'TIMEOUT')) {
          msg += buildSslCertInstructions(ip, port);
        }
        resolve({ success: false, detail: msg });
      }
    });
  });
}

export async function printReceiptViaEpos(ip: string, payload: ReceiptPayload): Promise<void> {
  const result = await connectAndPrint(ip, (printer) => buildReceiptOnPrinter(printer, payload));
  if (!result.success) {
    throw new Error(result.detail);
  }
}

export async function printFullReceiptViaEpos(ip: string, payload: FullReceiptPayload): Promise<void> {
  const result = await connectAndPrint(ip, (printer) => buildFullReceiptOnPrinter(printer, payload));
  if (!result.success) {
    throw new Error(result.detail);
  }
}

export async function printReceiptsViaEpos(ip: string, payloads: ReceiptPayload[]): Promise<void> {
  for (const p of payloads) {
    await printReceiptViaEpos(ip, p);
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

  const port = getEposPort();
  const isSecure = port === 8043;

  return new Promise((resolve) => {
    const ePosDev = new epson.ePOSDevice();
    let resolved = false;

    const timer = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      try { ePosDev.disconnect(); } catch {}
      let msg = `接続がタイムアウトしました（30秒） [${isSecure ? 'wss' : 'ws'}://${ip}:${port}]`;
      if (isSecure) {
        msg += buildSslCertInstructions(ip, port);
      }
      resolve({ ok: false, message: msg });
    }, 30000);

    ePosDev.connect(ip, port, (result: string) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);

      if (result === 'OK' || result === 'SSL_CONNECT_OK') {
        try { ePosDev.disconnect(); } catch {}
        resolve({
          ok: true,
          message: `正常に接続されました (${isSecure ? 'wss' : 'ws'}://${ip}:${port})`,
        });
      } else {
        let msg = `接続失敗: ${result} [${isSecure ? 'wss' : 'ws'}://${ip}:${port}]`;
        if (isSecure && (result === 'ERROR' || result === 'TIMEOUT')) {
          msg += buildSslCertInstructions(ip, port);
        } else if (result === 'ERROR') {
          msg += '\n\nプリンターの ePOS-Print が有効であるか、IP アドレスが正しいか確認してください。';
        }
        resolve({ ok: false, message: msg });
      }
    });
  });
}
