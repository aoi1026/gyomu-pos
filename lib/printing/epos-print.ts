'use client';

import type { ReceiptPayload, FullReceiptPayload } from '@/lib/printing/escpos-raster';
import { makeReceiptCanvas, makeFullReceiptCanvas } from '@/lib/printing/escpos-raster';

const EPOS_SDK_URL = '/epos/epos-2.27.0.js';
const RECEIPT_WIDTH_PX = 576;

function getEposPort(): number {
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return 8043;
  }
  return 8008;
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
  COLOR_1: string;
  MODE_MONO: string;
  MODE_GRAY16: string;
  CUT_FEED: string;
  HALFTONE_DITHER: string;
  HALFTONE_ERROR_DIFFUSION: string;
  HALFTONE_THRESHOLD: string;
  timeout: number;
  halftone: number;
  brightness: number;
  onreceive: ((res: { success: boolean; code: string; status: number }) => void) | null;
  onerror: ((err: any) => void) | null;
  addImage(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    color?: string,
    mode?: string
  ): void;
  addFeedLine(lines: number): void;
  addCut(type: string): void;
  send(): void;
};

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
                devobj.addImage(ctx, 0, 0, canvas.width, canvas.height, devobj.COLOR_1, devobj.MODE_MONO);
                devobj.addFeedLine(3);
                devobj.addCut(devobj.CUT_FEED);
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
        } else if (connectResult === 'ERROR') {
          msg += '\n\nプリンターの ePOS-Print が有効であるか、IP アドレスが正しいか確認してください。';
        }
        resolve({ success: false, detail: msg });
      }
    });
  });
}

/** ReceiptPayload をキャンバス画像として ePOS で印刷 */
export async function printReceiptViaEpos(ip: string, payload: ReceiptPayload): Promise<void> {
  const canvas = makeReceiptCanvas(payload, RECEIPT_WIDTH_PX);
  const result = await connectAndPrint(ip, canvas);
  if (!result.success) {
    throw new Error(result.detail);
  }
}

/** FullReceiptPayload をキャンバス画像として ePOS で印刷 */
export async function printFullReceiptViaEpos(ip: string, payload: FullReceiptPayload): Promise<void> {
  const canvas = makeFullReceiptCanvas(payload, RECEIPT_WIDTH_PX);
  const result = await connectAndPrint(ip, canvas);
  if (!result.success) {
    throw new Error(result.detail);
  }
}

/** 複数 ReceiptPayload をキャンバス画像として ePOS で印刷 */
export async function printReceiptsViaEpos(ip: string, payloads: ReceiptPayload[]): Promise<void> {
  for (const p of payloads) {
    await printReceiptViaEpos(ip, p);
  }
}

/** ePOS 接続テスト */
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
