'use client';

import type { ReceiptPayload, FullReceiptPayload } from '@/lib/printing/escpos-raster';
import { makeReceiptCanvas, makeFullReceiptCanvas } from '@/lib/printing/escpos-raster';

const EPOS_SDK_URL = '/epos/epos-2.27.0.js';
const RECEIPT_WIDTH_PX = 576;

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
  COLOR_1: string;
  MODE_MONO: string;
  CUT_FEED: string;
  timeout: number;
  onreceive: ((res: { success: boolean; code: string; status: number }) => void) | null;
  onerror: ((err: any) => void) | null;
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

async function connectAndPrintImage(
  ip: string,
  canvas: HTMLCanvasElement
): Promise<{ success: boolean; detail: string }> {
  await loadEpsonSdk();
  const epson = (window as any).epson;
  if (!epson?.ePOSDevice) {
    return { success: false, detail: 'Epson ePOS SDK が利用できません' };
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { success: false, detail: 'Canvas コンテキストを取得できません' };
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
            devobj.addImage(ctx, 0, 0, canvas.width, canvas.height, devobj.COLOR_1, devobj.MODE_MONO);
            devobj.addFeedLine(3);
            devobj.addCut(devobj.CUT_FEED);
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
  const canvas = makeReceiptCanvas(payload, RECEIPT_WIDTH_PX);
  const result = await connectAndPrintImage(ip, canvas);
  if (!result.success) throw new Error(result.detail);
}

export async function printFullReceiptViaEpos(ip: string, payload: FullReceiptPayload): Promise<void> {
  const canvas = makeFullReceiptCanvas(payload, RECEIPT_WIDTH_PX);
  const result = await connectAndPrintImage(ip, canvas);
  if (!result.success) throw new Error(result.detail);
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
  const conn = await connectToPrinter(epson, ip);
  if (!conn.ok) {
    return { ok: false, message: buildConnectionErrorMessage(ip, conn.errors) };
  }
  const { ePosDev, port } = conn;
  try { ePosDev.disconnect(); } catch {}
  return { ok: true, message: `正常に接続されました (${ip}:${port})` };
}
