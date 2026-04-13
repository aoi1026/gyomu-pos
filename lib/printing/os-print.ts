import type { ReceiptPayload, FullReceiptPayload } from '@/lib/printing/escpos-raster';
import { formatYen } from '@/lib/printing/escpos-raster';

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1) ||
    (/Macintosh/.test(navigator.userAgent) && typeof document !== 'undefined' && 'ontouchend' in document);
}

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
  if (payload.footerAddress?.trim()) footerParts.push(`<div>${escapeHtml(payload.footerAddress.trim())}</div>`);
  if (payload.footerPhone?.trim()) footerParts.push(`<div>TEL:${escapeHtml(payload.footerPhone.trim())}</div>`);
  const footerHtml = footerParts.length ? `<div class="footer">${footerParts.join('')}</div>` : '';

  return `
    <div class="receipt">
      <div class="center store">${escapeHtml(payload.storeName || 'STORE')}</div>
      <div class="center table">${escapeHtml(payload.tableName)}</div>
      <div class="center title">【 ${escapeHtml(payload.title)} 】</div>
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
  .store { font-weight: bold; font-size: 18px; margin-bottom: 4px; }
  .table { font-weight: bold; font-size: 14px; color: #000; margin-bottom: 4px; }
  .title { font-weight: bold; font-size: 12px; margin-bottom: 6px; }
  .separator { border-top: 1px dashed #999; margin: 6px 0; }
  .lines { font-size: 11px; }
  .line-row { display: flex; justify-content: space-between; margin: 2px 0; }
  .line-row .left { flex: 1; }
  .line-row .right { text-align: right; margin-left: 8px; }
  .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; margin: 8px 0 4px; }
  .total-row .right { margin-left: 8px; }
  .issued { font-size: 10px; color: #555; margin-top: 4px; }
  .footer { text-align: center; font-size: 10px; color: #333; margin-top: 8px; padding-top: 6px; border-top: 1px dashed #ccc; }
  .page-break { page-break-after: always; }
  .page-break:last-child { page-break-after: auto; }
  .full-receipt .store-name { font-weight: bold; font-size: 22px; margin-bottom: 6px; }
  .full-receipt .table-num { font-weight: bold; font-size: 14px; margin-bottom: 6px; }
  .full-receipt .greeting { font-size: 11px; color: #000; margin-bottom: 8px; white-space: pre-line; }
  .full-receipt .store-info { text-align: center; font-size: 10px; color: #000; margin-bottom: 4px; }
  .full-receipt .payment-id { font-size: 10px; color: #000; margin-bottom: 8px; }
  .full-receipt .order-table { width: 100%; font-size: 11px; border-collapse: collapse; margin: 4px 0; }
  .full-receipt .order-table th { font-weight: bold; text-align: left; padding: 2px 4px 2px 0; }
  .full-receipt .order-table th.qty, .full-receipt .order-table th.amt { text-align: right; }
  .full-receipt .order-table td { padding: 2px 4px 2px 0; }
  .full-receipt .order-table td.qty, .full-receipt .order-table td.amt { text-align: right; }
  .full-receipt .subtotal-block { font-size: 11px; margin: 4px 0; }
  .full-receipt .total-block { display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; margin: 8px 0 4px; }
  .full-receipt .tax-detail { font-size: 9px; color: #333; text-align: center; margin-bottom: 8px; }
  .full-receipt .footer-info { text-align: center; font-size: 9px; color: #000; margin-top: 8px; padding-top: 6px; border-top: 1px dashed #ccc; }
`;

function formatAmountEn(amount: number): string {
  const n = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `${n.toLocaleString('ja-JP')}円`;
}

function formatAmountPlain(amount: number): string {
  const n = Number.isFinite(amount) ? Math.round(amount) : 0;
  return n.toLocaleString('ja-JP');
}

function fullReceiptToHtml(p: FullReceiptPayload): string {
  const greetingHtml = escapeHtml((p.greeting || '').trim()).replace(/\n/g, '<br/>');
  const orderRows = p.orderLines
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.item)}</td><td class="qty">${r.qty}</td><td class="amt">${formatAmountPlain(r.amount)}</td></tr>`
    )
    .join('');

  const bottomParts: string[] = [];
  const idPayment: string[] = [];
  if (p.storeId) idPayment.push(`ID:${escapeHtml(p.storeId)}`);
  if (p.paymentMethod) idPayment.push(`支払方法:${escapeHtml(p.paymentMethod)}`);
  if (idPayment.length) bottomParts.push(`<div>${idPayment.join('&nbsp;&nbsp;')}</div>`);
  const timeGuest: string[] = [];
  if (p.startTime) timeGuest.push(`開始時間:${escapeHtml(p.startTime)}`);
  if (p.guestCount) timeGuest.push(`人数: ${escapeHtml(p.guestCount)}`);
  if (timeGuest.length) bottomParts.push(`<div>${timeGuest.join('&nbsp;&nbsp;')}</div>`);
  if (p.nomineeNames?.trim()) bottomParts.push(`<div>指名:${escapeHtml(p.nomineeNames.trim())}</div>`);

  return `
    <div class="receipt full-receipt">
      <div class="center store-name">${escapeHtml(p.storeName || 'STORE')}</div>
      <div class="center table-num">【 ${escapeHtml(p.tableNumber)} 】</div>
      <div class="center greeting">${greetingHtml}</div>
      <div class="store-info">
        ${p.storeAddress?.trim() ? `<div>${escapeHtml(p.storeAddress.trim())}</div>` : ''}
        ${p.storePhone?.trim() ? `<div>TEL:${escapeHtml(p.storePhone.trim())}</div>` : ''}
      </div>
      ${p.paymentId ? `<div class="payment-id">登録番号:${escapeHtml(p.paymentId)}</div>` : ''}
      <table class="order-table">
        <thead><tr><th>項目</th><th class="qty">数量</th><th class="amt">金額</th></tr></thead>
        <tbody>${orderRows}</tbody>
      </table>
      <div class="separator"></div>
      <div class="subtotal-block">
        <div class="line-row"><span class="left">小　計</span><span class="right">${formatAmountEn(p.subtotal)}</span></div>
        <div class="line-row"><span class="left">SC TAX</span><span class="right">${formatAmountEn(p.tax)}</span></div>
      </div>
      <div class="total-block"><span>合　計</span><span>${formatAmountEn(p.total)}</span></div>
      <div class="tax-detail">${escapeHtml(p.taxDetailText || '')}</div>
      <div class="footer-info">${bottomParts.join('')}</div>
    </div>
  `;
}

function buildReceiptPageHtml(bodyContent: string, title: string): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>${PRINT_STYLES}</style>
  </head>
  <body>${bodyContent}</body>
</html>`;
}

function printViaIframe(fullHtml: string): void {
  const FRAME_ID = 'pos-print-frame';
  let iframe = document.getElementById(FRAME_ID) as HTMLIFrameElement | null;
  if (iframe) iframe.remove();

  iframe = document.createElement('iframe');
  iframe.id = FRAME_ID;
  Object.assign(iframe.style, {
    position: 'fixed',
    right: '0',
    bottom: '0',
    width: '0',
    height: '0',
    border: 'none',
    overflow: 'hidden',
    opacity: '0',
    pointerEvents: 'none',
  });
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    throw new Error('印刷用フレームにアクセスできませんでした');
  }

  doc.open();
  doc.write(fullHtml);
  doc.close();

  const iframeRef = iframe;
  setTimeout(() => {
    try {
      iframeRef.contentWindow?.focus();
      iframeRef.contentWindow?.print();
    } catch {
      printViaPopup(fullHtml);
    }
  }, 300);
}

function printViaPopup(fullHtml: string): void {
  const w = window.open('', 'pos_os_print', 'width=420,height=680');
  if (!w) {
    throw new Error('ポップアップがブロックされました。ポップアップ許可後に再度お試しください。');
  }
  w.document.open();
  w.document.write(fullHtml + `<script>setTimeout(function(){window.print();window.onafterprint=function(){window.close()};},150)<\/script>`);
  w.document.close();
}

function doPrint(fullHtml: string): void {
  if (isIOS()) {
    printViaIframe(fullHtml);
  } else {
    printViaPopup(fullHtml);
  }
}

/**
 * OSの印刷ダイアログを使用してレシートを印刷します。
 * iPadではiframeベースで印刷ダイアログを表示（ポップアップブロック回避）。
 * デスクトップではポップアップウィンドウを使用。
 */
export function printReceiptViaOs(payloads: ReceiptPayload | ReceiptPayload[]): void {
  const list = Array.isArray(payloads) ? payloads : [payloads];
  if (list.length === 0) return;

  const receiptsHtml = list
    .map((p, i) => {
      const html = payloadToHtml(p);
      const breaker = i < list.length - 1 ? '<div class="page-break"></div>' : '';
      return `<div class="paper">${html}</div>${breaker}`;
    })
    .join('');

  doPrint(buildReceiptPageHtml(receiptsHtml, '印刷'));
}

/**
 * 領収書（フル形式・画像デザイン）をOSの印刷ダイアログで印刷します。
 */
export function printFullReceiptViaOs(payload: FullReceiptPayload): void {
  const html = fullReceiptToHtml(payload);
  doPrint(buildReceiptPageHtml(`<div class="paper">${html}</div>`, '領収書 印刷'));
}

/**
 * 領収書（フル形式）をプレビューウィンドウで表示します。
 */
export function previewFullReceiptInWindow(payload: FullReceiptPayload): void {
  const html = fullReceiptToHtml(payload);
  const fullHtml = buildReceiptPageHtml(`<div class="paper">${html}</div>`, '領収書 プレビュー');
  const w = window.open('', 'pos_os_preview', 'width=420,height=680');
  if (!w) {
    throw new Error('ポップアップがブロックされました。ポップアップ許可後に再度お試しください。');
  }
  w.document.open();
  w.document.write(fullHtml);
  w.document.close();
}

/**
 * レシートをプレビューウィンドウで表示します（印刷ダイアログは開きません）。
 */
export function previewReceiptInWindow(payloads: ReceiptPayload | ReceiptPayload[]): void {
  const list = Array.isArray(payloads) ? payloads : [payloads];
  if (list.length === 0) return;

  const receiptsHtml = list
    .map((p, i) => {
      const html = payloadToHtml(p);
      const breaker = i < list.length - 1 ? '<div class="page-break"></div>' : '';
      return `<div class="paper">${html}</div>${breaker}`;
    })
    .join('');

  const fullHtml = buildReceiptPageHtml(receiptsHtml, 'プレビュー');
  const w = window.open('', 'pos_os_preview', 'width=420,height=680');
  if (!w) {
    throw new Error('ポップアップがブロックされました。ポップアップ許可後に再度お試しください。');
  }
  w.document.open();
  w.document.write(fullHtml);
  w.document.close();
}
