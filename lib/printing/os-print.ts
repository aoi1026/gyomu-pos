import type { ReceiptPayload } from '@/lib/printing/escpos-raster';
import { formatYen } from '@/lib/printing/escpos-raster';

function formatIssuedAt(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd} ${hh}:${mi}`;
}

function payloadToHtml(payload: ReceiptPayload): string {
  const linesHtml = payload.lines
    .map(
      (l) =>
        `<div class="line-row"><span class="left">${escapeHtml(l.left)}</span>${l.right ? `<span class="right">${escapeHtml(l.right)}</span>` : ''}</div>`
    )
    .join('');
  const footerParts: string[] = [];
  if (payload.footerAddress?.trim()) footerParts.push(`<div>住所: ${escapeHtml(payload.footerAddress.trim())}</div>`);
  if (payload.footerPhone?.trim()) footerParts.push(`<div>電話番号: ${escapeHtml(payload.footerPhone.trim())}</div>`);
  const footerHtml = footerParts.length ? `<div class="footer">${footerParts.join('')}</div>` : '';

  return `
    <div class="receipt">
      <div class="center store">${escapeHtml(payload.storeName || 'STORE')}</div>
      <div class="center table">${escapeHtml(payload.tableName)}</div>
      <div class="center title">【${escapeHtml(payload.title)}】</div>
      <div class="separator"></div>
      <div class="lines">${linesHtml}</div>
      <div class="separator"></div>
      <div class="total-row">
        <span class="left">${escapeHtml(payload.totalLabel)}</span>
        <span class="right">${formatYen(payload.totalAmount)}</span>
      </div>
      <div class="center issued">発行: ${formatIssuedAt(payload.issuedAt)}</div>
      ${footerHtml}
    </div>
  `;
}

function escapeHtml(s: string): string {
  if (typeof document === 'undefined') {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  const el = document.createElement('div');
  el.textContent = s;
  return el.innerHTML;
}

const PRINT_STYLES = `
  @page { size: 80mm auto; margin: 4mm; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; font-size: 11px; }
  .paper { width: 72mm; padding: 4mm; }
  .receipt { padding: 4px 0; }
  .center { text-align: center; }
  .store { font-weight: bold; font-size: 14px; margin-bottom: 2px; }
  .table { font-size: 10px; color: #333; margin-bottom: 2px; }
  .title { font-weight: bold; font-size: 11px; margin-bottom: 6px; }
  .separator { border-top: 1px dashed #999; margin: 6px 0; }
  .lines { font-size: 10px; }
  .line-row { display: flex; justify-content: space-between; margin: 2px 0; }
  .line-row .left { flex: 1; }
  .line-row .right { text-align: right; margin-left: 8px; }
  .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 12px; margin: 8px 0 4px; }
  .total-row .right { margin-left: 8px; }
  .issued { font-size: 10px; color: #555; margin-top: 4px; }
  .footer { text-align: center; font-size: 10px; color: #333; margin-top: 8px; padding-top: 6px; border-top: 1px dashed #ccc; }
  .page-break { page-break-after: always; }
  .page-break:last-child { page-break-after: auto; }
`;

/**
 * OSの印刷ダイアログを使用してレシートを印刷します。
 * iPadなどWeb Bluetooth非対応環境でも、デバイスレベルで接続済みのプリンターに印刷できます。
 */
export function printReceiptViaOs(payloads: ReceiptPayload | ReceiptPayload[]): void {
  const list = Array.isArray(payloads) ? payloads : [payloads];
  if (list.length === 0) return;

  const w = window.open('', 'pos_os_print', 'width=420,height=680');
  if (!w) {
    throw new Error('ポップアップがブロックされました。ポップアップ許可後に再度お試しください。');
  }

  const receiptsHtml = list
    .map((p, i) => {
      const html = payloadToHtml(p);
      const breaker = i < list.length - 1 ? '<div class="page-break"></div>' : '';
      return `<div class="paper">${html}</div>${breaker}`;
    })
    .join('');

  w.document.open();
  w.document.write(`
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>印刷</title>
    <style>${PRINT_STYLES}</style>
  </head>
  <body>
    ${receiptsHtml}
    <script>
      setTimeout(function() { window.print(); window.onafterprint = function() { window.close(); }; }, 150);
    </script>
  </body>
</html>
  `);
  w.document.close();
}

/**
 * レシートをプレビューウィンドウで表示します（印刷ダイアログは開きません）。
 */
export function previewReceiptInWindow(payloads: ReceiptPayload | ReceiptPayload[]): void {
  const list = Array.isArray(payloads) ? payloads : [payloads];
  if (list.length === 0) return;

  const w = window.open('', 'pos_os_preview', 'width=420,height=680');
  if (!w) {
    throw new Error('ポップアップがブロックされました。ポップアップ許可後に再度お試しください。');
  }

  const receiptsHtml = list
    .map((p, i) => {
      const html = payloadToHtml(p);
      const breaker = i < list.length - 1 ? '<div class="page-break"></div>' : '';
      return `<div class="paper">${html}</div>${breaker}`;
    })
    .join('');

  w.document.open();
  w.document.write(`
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>プレビュー</title>
    <style>${PRINT_STYLES}</style>
  </head>
  <body>
    ${receiptsHtml}
  </body>
</html>
  `);
  w.document.close();
}
