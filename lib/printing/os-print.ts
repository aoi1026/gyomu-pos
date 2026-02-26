import type { ReceiptPayload, FullReceiptPayload } from '@/lib/printing/escpos-raster';
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
  .full-receipt .store-name { font-weight: bold; font-size: 16px; margin-bottom: 4px; }
  .full-receipt .table-num { font-size: 11px; margin-bottom: 4px; }
  .full-receipt .greeting { font-size: 10px; color: #333; margin-bottom: 8px; white-space: pre-line; }
  .full-receipt .store-info { font-size: 10px; color: #444; margin-bottom: 8px; }
  .full-receipt .order-table { width: 100%; font-size: 10px; border-collapse: collapse; margin: 8px 0; }
  .full-receipt .order-table th { text-align: left; padding: 2px 4px 2px 0; }
  .full-receipt .order-table th.qty, .full-receipt .order-table th.amt { text-align: right; }
  .full-receipt .order-table td { padding: 2px 4px 2px 0; }
  .full-receipt .order-table td.qty, .full-receipt .order-table td.amt { text-align: right; }
  .full-receipt .total-block { font-weight: bold; font-size: 13px; margin: 8px 0 2px; }
  .full-receipt .tax-detail { font-size: 9px; color: #555; margin-bottom: 8px; }
  .full-receipt .footer-info { font-size: 9px; color: #444; margin-top: 8px; padding-top: 6px; border-top: 1px dashed #ccc; }
`;

function fullReceiptToHtml(p: FullReceiptPayload): string {
  const greetingHtml = escapeHtml((p.greeting || '').trim()).replace(/\n/g, '<br/>');
  const orderRows = p.orderLines
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.item)}</td><td class="qty">${r.qty}</td><td class="amt">${formatYen(r.amount)}</td></tr>`
    )
    .join('');
  return `
    <div class="receipt full-receipt">
      <div class="center store-name">${escapeHtml(p.storeName || 'STORE')}</div>
      <div class="center table-num">【${escapeHtml(p.tableNumber)}】</div>
      <div class="center greeting">${greetingHtml}</div>
      <div class="store-info">
        ${p.storeAddress?.trim() ? `<div>${escapeHtml(p.storeAddress.trim())}</div>` : ''}
        ${p.storePhone?.trim() ? `<div>TEL:${escapeHtml(p.storePhone.trim())}</div>` : ''}
        ${p.paymentId ? `<div>登録番号:${escapeHtml(p.paymentId)}</div>` : ''}
      </div>
      <table class="order-table">
        <thead><tr><th>項目</th><th class="qty">数量</th><th class="amt">金額</th></tr></thead>
        <tbody>${orderRows}</tbody>
      </table>
      <div class="separator"></div>
      <div class="line-row"><span class="left">小計</span><span class="right">${formatYen(p.subtotal)}</span></div>
      <div class="line-row"><span class="left">SC TAX</span><span class="right">${formatYen(p.tax)}</span></div>
      <div class="separator"></div>
      <div class="total-row"><span class="left">合計</span><span class="right">${formatYen(p.total)}-</span></div>
      <div class="tax-detail">${escapeHtml(p.taxDetailText || '')}</div>
      <div class="footer-info">
        ${p.storeId ? `<div>ID:${escapeHtml(p.storeId)}</div>` : ''}
        ${p.paymentMethod ? `<div>支払方法:${escapeHtml(p.paymentMethod)}</div>` : ''}
        ${p.startTime ? `<div>開台時間:${escapeHtml(p.startTime)}</div>` : ''}
        ${p.guestCount ? `<div>開台人数:${escapeHtml(p.guestCount)}</div>` : ''}
      </div>
    </div>
  `;
}

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
 * 領収書（フル形式・画像デザイン）をOSの印刷ダイアログで印刷します。
 */
export function printFullReceiptViaOs(payload: FullReceiptPayload): void {
  const html = fullReceiptToHtml(payload);
  const w = window.open('', 'pos_os_print', 'width=420,height=680');
  if (!w) {
    throw new Error('ポップアップがブロックされました。ポップアップ許可後に再度お試しください。');
  }
  w.document.open();
  w.document.write(`
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>領収書 印刷</title>
    <style>${PRINT_STYLES}</style>
  </head>
  <body>
    <div class="paper">${html}</div>
    <script>
      setTimeout(function() { window.print(); window.onafterprint = function() { window.close(); }; }, 150);
    </script>
  </body>
</html>
  `);
  w.document.close();
}

/**
 * 領収書（フル形式）をプレビューウィンドウで表示します。
 */
export function previewFullReceiptInWindow(payload: FullReceiptPayload): void {
  const html = fullReceiptToHtml(payload);
  const w = window.open('', 'pos_os_preview', 'width=420,height=680');
  if (!w) {
    throw new Error('ポップアップがブロックされました。ポップアップ許可後に再度お試しください。');
  }
  w.document.open();
  w.document.write(`
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>領収書 プレビュー</title>
    <style>${PRINT_STYLES}</style>
  </head>
  <body>
    <div class="paper">${html}</div>
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
