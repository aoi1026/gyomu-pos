import type { RyoushushoPayload } from '@/lib/printing/escpos-raster';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatRyoushushoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd}`;
}

/** 参考デザインどおり ¥20,900－（全角ダッシュ） */
export function formatRyoushushoAmount(amount: number): string {
  const n = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `¥${n.toLocaleString('ja-JP')}－`;
}

/** 領収証の印刷・プレビュー用 CSS（ryoshusho_print.html 準拠） */
export const RYOUSHUSHO_PRINT_STYLES = `
  @page { size: 148mm 90mm; margin: 4mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'MS Mincho', 'Yu Mincho', 'Hiragino Mincho ProN', serif;
    background: #fff;
    padding: 0;
  }
  .receipt-wrapper {
    display: flex;
    justify-content: center;
  }
  .receipt {
    background: #fff;
    width: 148mm;
    min-height: 90mm;
    border: 1px solid #aaa;
    padding: 10mm 10mm 8mm 10mm;
    position: relative;
    font-family: 'MS Mincho', 'Yu Mincho', 'Hiragino Mincho ProN', serif;
  }
  .corner {
    position: absolute;
    font-size: 22px;
    color: #555;
    line-height: 1;
    font-family: serif;
  }
  .corner.tl { top: 5mm; left: 5mm; }
  .corner.tr { top: 5mm; right: 5mm; }
  .corner.bl { bottom: 5mm; left: 5mm; }
  .corner.br { bottom: 5mm; right: 5mm; }
  .receipt-header {
    text-align: center;
    font-size: 20px;
    letter-spacing: 0.4em;
    font-weight: bold;
    margin-bottom: 4mm;
    padding: 0 20mm;
  }
  .receipt-meta {
    text-align: right;
    font-size: 11px;
    line-height: 1.6;
    margin-bottom: 3mm;
  }
  .addressee {
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 2mm;
    border-bottom: 1px solid #000;
    padding-bottom: 1mm;
    display: inline-block;
    min-width: 60mm;
    letter-spacing: 0.05em;
    min-height: 1.2em;
  }
  .addressee-suffix {
    font-size: 15px;
    margin-left: 2px;
  }
  .amount-row {
    display: flex;
    align-items: flex-start;
    margin-bottom: 1mm;
    margin-top: 2mm;
  }
  .amount-value {
    font-size: 28px;
    font-weight: bold;
    letter-spacing: 0.05em;
    border-bottom: 2px solid #000;
    padding-bottom: 1mm;
    min-width: 70mm;
  }
  .stamp-area {
    position: absolute;
    right: 10mm;
    top: 30mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3mm;
  }
  .inkan-box {
    width: 20mm;
    height: 20mm;
    border: 1px solid #aaa;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    color: #888;
  }
  .in-label {
    font-size: 12px;
    margin-left: 2mm;
    align-self: flex-end;
    padding-bottom: 2mm;
  }
  .tadashi {
    font-size: 11px;
    margin-bottom: 4mm;
    color: #333;
  }
  .issuer {
    margin-top: 5mm;
    font-size: 11px;
    line-height: 1.7;
    color: #222;
  }
  .roman-numeral {
    position: absolute;
    right: 10mm;
    bottom: 8mm;
    font-size: 42px;
    font-weight: bold;
    letter-spacing: -2px;
    font-family: 'Times New Roman', serif;
  }
  .separator {
    border: none;
    border-top: 1px solid #000;
    margin: 1mm 0 2mm 0;
  }
  @media print {
    body { background: #fff; padding: 0; }
    .receipt { border: none; box-shadow: none; }
  }
`;

/** プレビュー用（ダイアログ内・グレー背景） */
export const RYOUSHUSHO_PREVIEW_STYLES = `
  ${RYOUSHUSHO_PRINT_STYLES}
  .ryoushusho-preview-host {
    display: flex;
    justify-content: center;
    background: #f0f0f0;
    padding: 12px;
    border-radius: 6px;
  }
  .ryoushusho-preview-host .receipt {
    box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  }
`;

/**
 * 領収証本体 HTML（参考 ryoshusho_print.html と同一構造）
 */
export function ryoushushoReceiptInnerHtml(p: RyoushushoPayload): string {
  const purpose = escapeHtml((p.purposeText || '飲食代').trim());
  const recipient = escapeHtml((p.recipientName || '').trim());
  const issueStr = formatRyoushushoDate(p.issueDate);
  const receiptNo = p.receiptNo?.trim() ? escapeHtml(p.receiptNo.trim()) : '';
  const storeName = escapeHtml(p.storeName || 'STORE');

  return `
    <div class="receipt">
      <div class="corner tl">❧</div>
      <div class="corner tr">❧</div>
      <div class="corner bl">❧</div>
      <div class="corner br">❧</div>

      <div class="receipt-header">領　収　証</div>

      <div class="receipt-meta">
        No.　${receiptNo}<br>
        発行日　${issueStr}
      </div>

      <div class="stamp-area">
        <div class="inkan-box">収入印紙</div>
      </div>

      <div style="margin-bottom:2mm;">
        <span class="addressee">${recipient}</span><span class="addressee-suffix">　様</span>
      </div>

      <div class="amount-row">
        <div class="amount-value">${formatRyoushushoAmount(p.amount)}</div>
        <div class="in-label">　印</div>
      </div>

      <div class="tadashi">
        ${purpose}　として　上記正に領収いたしました。
      </div>

      <hr class="separator">

      <div class="issuer">
        ${p.storeAddress?.trim() ? `<div>　　　　${escapeHtml(p.storeAddress.trim())}</div>` : ''}
        ${p.storePhone?.trim() ? `<div>　　　　TEL ${escapeHtml(p.storePhone.trim())}</div>` : ''}
      </div>

      <div class="roman-numeral">${storeName}</div>
    </div>
  `;
}

export function ryoushushoToHtml(p: RyoushushoPayload): string {
  return `<div class="receipt-wrapper">${ryoushushoReceiptInnerHtml(p)}</div>`;
}

export function buildRyoushushoPrintPageHtml(payload: RyoushushoPayload, title: string): string {
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>${RYOUSHUSHO_PRINT_STYLES}</style>
  </head>
  <body>${ryoushushoToHtml(payload)}</body>
</html>`;
}
