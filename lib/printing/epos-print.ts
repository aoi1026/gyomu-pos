'use client';

import type { ReceiptPayload, FullReceiptPayload } from '@/lib/printing/escpos-raster';

const EPOS_PRINT_CGI = '/cgi-bin/epos/service.cgi?devid=local_printer&timeout=60000';

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

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildSoapEnvelope(printXml: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
<s:Body>
<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">
${printXml}
</epos-print>
</s:Body>
</s:Envelope>`;
}

function receiptPayloadToXml(payload: ReceiptPayload): string {
  const lines: string[] = [];
  lines.push('<text align="center"/>');
  lines.push(`<text>${escapeXml(payload.storeName || 'STORE')}&#10;</text>`);
  lines.push(`<text>${escapeXml(payload.tableName)}&#10;</text>`);
  lines.push(`<text>【${escapeXml(payload.title)}】&#10;</text>`);
  lines.push(`<text>------------------------&#10;</text>`);

  lines.push('<text align="left"/>');
  for (const line of payload.lines) {
    const left = line.left ?? '';
    const right = line.right ?? '';
    if (right) {
      const pad = Math.max(1, 24 - left.length - right.length);
      lines.push(`<text>${escapeXml(left)}${' '.repeat(pad)}${escapeXml(right)}&#10;</text>`);
    } else {
      lines.push(`<text>${escapeXml(left)}&#10;</text>`);
    }
  }

  lines.push(`<text>------------------------&#10;</text>`);
  const totalPad = Math.max(1, 16 - payload.totalLabel.length);
  lines.push(`<text>${escapeXml(payload.totalLabel)}${' '.repeat(totalPad)}${escapeXml(formatYen(payload.totalAmount))}&#10;</text>`);

  lines.push('<text align="center"/>');
  lines.push(`<text>発行: ${escapeXml(formatIssuedAt(payload.issuedAt))}&#10;</text>`);
  if (payload.footerAddress?.trim()) {
    lines.push(`<text>住所: ${escapeXml(payload.footerAddress.trim())}&#10;</text>`);
  }
  if (payload.footerPhone?.trim()) {
    lines.push(`<text>電話番号: ${escapeXml(payload.footerPhone.trim())}&#10;</text>`);
  }
  lines.push('<feed line="3"/>');
  lines.push('<cut type="feed"/>');
  return lines.join('\n');
}

function fullReceiptPayloadToXml(payload: FullReceiptPayload): string {
  const lines: string[] = [];
  lines.push('<text align="center"/>');
  lines.push(`<text>${escapeXml(payload.storeName || 'STORE')}&#10;</text>`);
  lines.push(`<text>【${escapeXml(payload.tableNumber)}】&#10;</text>`);
  if (payload.greeting?.trim()) {
    for (const gl of payload.greeting.trim().split(/\r?\n/)) {
      lines.push(`<text>${escapeXml(gl)}&#10;</text>`);
    }
  }

  if (payload.storeAddress?.trim() || payload.storePhone?.trim()) {
    lines.push('<text align="left"/>');
    if (payload.storeAddress?.trim()) lines.push(`<text>${escapeXml(payload.storeAddress.trim())}&#10;</text>`);
    if (payload.storePhone?.trim()) lines.push(`<text>TEL:${escapeXml(payload.storePhone.trim())}&#10;</text>`);
    if (payload.paymentId) lines.push(`<text>登録番号:${escapeXml(payload.paymentId)}&#10;</text>`);
  }

  lines.push('<text align="center"/>');
  lines.push(`<text>--- 注文明細 ---&#10;</text>`);
  lines.push('<text align="left"/>');

  for (const row of payload.orderLines) {
    const item = row.item.slice(0, 20);
    lines.push(`<text>${escapeXml(item)} x${row.qty}  ${escapeXml(formatYen(row.amount))}&#10;</text>`);
  }

  lines.push(`<text>------------------------&#10;</text>`);
  lines.push(`<text>小計  ${escapeXml(formatYen(payload.subtotal))}&#10;</text>`);
  lines.push(`<text>SC TAX  ${escapeXml(formatYen(payload.tax))}&#10;</text>`);
  lines.push(`<text>------------------------&#10;</text>`);
  lines.push(`<text>合計  ${escapeXml(formatYen(payload.total))}-&#10;</text>`);
  if (payload.taxDetailText) lines.push(`<text>${escapeXml(payload.taxDetailText)}&#10;</text>`);
  if (payload.storeId) lines.push(`<text>ID:${escapeXml(payload.storeId)}&#10;</text>`);
  if (payload.paymentMethod) lines.push(`<text>支払方法:${escapeXml(payload.paymentMethod)}&#10;</text>`);
  if (payload.startTime) lines.push(`<text>開台時間:${escapeXml(payload.startTime)}&#10;</text>`);
  if (payload.guestCount) lines.push(`<text>開台人数:${escapeXml(payload.guestCount)}&#10;</text>`);
  lines.push('<feed line="3"/>');
  lines.push('<cut type="feed"/>');
  return lines.join('\n');
}

function parseEposPrintResponse(responseText: string): { success: boolean; detail: string } {
  const successMatch = responseText.match(/success="([^"]*)"/);
  const codeMatch = responseText.match(/code="([^"]*)"/);
  const statusMatch = responseText.match(/status="([^"]*)"/);

  const isSuccess = successMatch?.[1] === 'true';
  if (isSuccess) {
    return { success: true, detail: '正常に印刷されました' };
  }

  const code = codeMatch?.[1] || 'unknown';
  const status = statusMatch?.[1] || 'unknown';

  const codeDescriptions: Record<string, string> = {
    'EPOS_OC_NOCONNECT': 'プリンターに接続できません',
    'EPOS_OC_PARAM_ERROR': 'パラメータエラー',
    'EPOS_OC_TIMEOUT': '通信タイムアウト',
    'DeviceNotFound': 'プリンターデバイスが見つかりません（Device ID: local_printer を確認）',
    'EX_BADPORT': 'ポート設定エラー',
    'EX_TIMEOUT': 'タイムアウト',
    'SchemaError': 'XML形式エラー',
  };

  const desc = codeDescriptions[code] || `エラーコード: ${code}`;
  return {
    success: false,
    detail: `${desc} (status: ${status})`,
  };
}

/** client → printer 直接 HTTP (ePOS-Print XML) */
async function sendDirectToPrinter(ip: string, soapBody: string): Promise<{ success: boolean; detail: string }> {
  const url = `http://${ip}${EPOS_PRINT_CGI}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': '""',
      },
      body: soapBody,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const responseText = await res.text();

    if (!res.ok) {
      return {
        success: false,
        detail: `プリンター応答エラー (HTTP ${res.status})`,
      };
    }

    return parseEposPrintResponse(responseText);
  } catch (e: any) {
    clearTimeout(timeout);
    if (e?.name === 'AbortError') {
      return { success: false, detail: '接続がタイムアウトしました（60秒）' };
    }
    throw e;
  }
}

/** サーバー経由 proxy (CORS / mixed-content 回避用) */
async function sendViaServerProxy(ip: string, soapBody: string): Promise<{ success: boolean; detail: string }> {
  const res = await fetch('/api/print/epos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ip, soap: soapBody }),
  });

  const contentType = res.headers.get('content-type') || '';

  if (contentType.includes('text/xml')) {
    const responseText = await res.text();
    return parseEposPrintResponse(responseText);
  }

  const bodyText = await res.text();
  let json: any;
  try {
    json = JSON.parse(bodyText);
  } catch {
    return { success: false, detail: `サーバープロキシ応答エラー (HTTP ${res.status})` };
  }

  if (!json.success) {
    return { success: false, detail: json.error || 'サーバープロキシ経由の印刷に失敗しました' };
  }
  return { success: true, detail: '正常に印刷されました（サーバー経由）' };
}

async function sendEposPrintXml(ip: string, printXml: string): Promise<{ success: boolean; detail: string }> {
  const soapBody = buildSoapEnvelope(printXml);

  try {
    return await sendDirectToPrinter(ip, soapBody);
  } catch (directError: any) {
    console.warn('[ePOS] Direct failed, trying server proxy:', directError?.message);
    try {
      return await sendViaServerProxy(ip, soapBody);
    } catch (proxyError: any) {
      return {
        success: false,
        detail: `直接接続: ${directError?.message || '通信エラー'} / サーバー経由: ${proxyError?.message || '通信エラー'}`,
      };
    }
  }
}

/** ReceiptPayload を ePOS-Print XML で印刷 */
export async function printReceiptViaEpos(ip: string, payload: ReceiptPayload): Promise<void> {
  const xml = receiptPayloadToXml(payload);
  const result = await sendEposPrintXml(ip, xml);
  if (!result.success) {
    throw new Error(result.detail);
  }
}

/** FullReceiptPayload を ePOS-Print XML で印刷 */
export async function printFullReceiptViaEpos(ip: string, payload: FullReceiptPayload): Promise<void> {
  const xml = fullReceiptPayloadToXml(payload);
  const result = await sendEposPrintXml(ip, xml);
  if (!result.success) {
    throw new Error(result.detail);
  }
}

/** 複数 ReceiptPayload を ePOS-Print XML で印刷 */
export async function printReceiptsViaEpos(ip: string, payloads: ReceiptPayload[]): Promise<void> {
  for (const p of payloads) {
    await printReceiptViaEpos(ip, p);
  }
}

/** ePOS 接続テスト */
export async function testEposConnection(ip: string): Promise<{ ok: boolean; message: string }> {
  const testXml = '';
  const soapBody = buildSoapEnvelope(testXml);

  try {
    const directResult = await sendDirectToPrinter(ip, soapBody);
    if (directResult.success) {
      return { ok: true, message: `正常に接続されました (${ip}) [直接接続]` };
    }

    if (directResult.detail.includes('DeviceNotFound')) {
      return { ok: false, message: `プリンターの Device ID 設定を確認してください: ${directResult.detail}` };
    }

    return { ok: true, message: `正常に接続されました (${ip}) - プリンター応答あり` };
  } catch (directError: any) {
    console.warn('[ePOS] Direct test failed, trying server proxy:', directError?.message);

    try {
      const res = await fetch(`/api/print/epos?ip=${encodeURIComponent(ip)}`);
      const bodyText = await res.text();
      let json: any;
      try {
        json = JSON.parse(bodyText);
      } catch {
        return {
          ok: false,
          message: `サーバープロキシ応答エラー (HTTP ${res.status})。サーバーとプリンターが同じネットワークにあるか確認してください。`,
        };
      }
      if (json.success) {
        return { ok: true, message: json.message || `正常に接続されました (${ip}) [サーバー経由]` };
      }
      return { ok: false, message: json.error || '接続テストに失敗しました' };
    } catch (proxyError: any) {
      const directMsg = directError?.message || '通信エラー';
      const hint = directMsg.toLowerCase().includes('failed to fetch')
        ? 'ブラウザからプリンターへの直接通信がブロックされています。HTTPSサイトからHTTPプリンターへの接続はブラウザにより制限されます。'
        : directMsg;
      return {
        ok: false,
        message: `接続に失敗しました: ${hint}`,
      };
    }
  }
}

export function loadEpsonSdk(): Promise<void> {
  return Promise.resolve();
}
