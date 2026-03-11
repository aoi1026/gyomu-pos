# Epson ePOS SDK for JavaScript

プリンターの Wi-Fi 印刷（ePOS WebSocket、ポート 8008）を使用するには、Epson ePOS SDK が必要です。

## プリンター設定（必須）

1. プリンターの管理ページを開く: `http://プリンターのIP`（例: http://192.168.1.120）
2. **ePOS-Print → Enable = ON** に設定
3. ポート **8008** が使用可能であることを確認

## セットアップ

1. [Epson ePOS SDK for JavaScript](https://download.epson.biz/sec_pubs/pos/reference_en/epos_js/index.html) から SDK をダウンロード
2. ZIP 内の `epos-2.27.0.js` をこのフォルダに配置
3. ファイル名が異なる場合は、`layout.tsx` と `lib/printing/epos-print.ts` のパスを更新

例: `epos-2.27.0.js` を `public/epos/epos-2.27.0.js` に配置

## ネットワーク接続

- iPad とプリンターは**同一 Wi-Fi ルーター**に接続する必要があります
- 接続フロー: iPad（ブラウザ）→ ePOS WebSocket（ポート 8008）→ プリンター
