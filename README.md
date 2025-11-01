# 🍷 NightWork POS - キャバクラ特化統合POSシステム

A comprehensive Point of Sale (POS) system specifically designed for cabaret clubs, featuring table-based ordering, cast nomination management, back rate calculations, attendance tracking, and comprehensive business management.

**Version 3.0.0** - キャバクラ特化統合POSシステム - テーブルファースト設計でキャストが注文を管理し、指名・バック率計算まで完結

## 📋 目次

- [システム概要](#システム概要)
- [主要機能](#主要機能)
- [技術スタック](#技術スタック)
- [アーキテクチャ](#アーキテクチャ)
- [インストール](#インストール)
- [使用方法](#使用方法)
- [役割別機能](#役割別機能)
- [操作フロー](#操作フロー)
- [API仕様](#api仕様)
- [データベーススキーマ](#データベーススキーマ)
- [コンポーネント構造](#コンポーネント構造)
- [認証・権限管理](#認証権限管理)
- [レスポンシブデザイン](#レスポンシブデザイン)
- [開発](#開発)
- [デプロイ](#デプロイ)

## 🎯 システム概要

NightWork POSは、キャバクラ業界に特化した統合POSシステムです。Next.js 14とTypeScriptで構築され、テーブルファースト設計により、キャストがテーブルで注文を管理し、指名・バック率計算まで効率的に処理できます。

### 主要特徴
- **テーブルファースト設計**: キャストがテーブルで注文を管理
- **指名システム**: 本指名・場内指名の完全サポート
- **バック率計算**: ドリンク・ボトル・指名別の自動計算
- **統合管理**: 勤怠・給与・売上・顧客の一元管理
- **4つのロール**: テーブルログイン、キャスト、管理者、システム管理者
- **リアルタイム管理**: テーブル状況、注文、セッションの監視
- **モバイル対応**: レスポンシブデザインによる全デバイス対応

## ✨ 主要機能

### 🍷 テーブル・注文管理
- **テーブルログイン**: テーブル選択と顧客選択（本指名・フリー）
- **注文作成**: メニュー選択・キャスト選択・カート機能
- **指名管理**: 本指名・場内指名の管理・指名履歴
- **サービス注文**: おしぼり、灰皿交換、グラス、箸など
- **スタッフ呼び出し**: 管理・サービス・緊急呼び出し

### 👑 指名・バック率システム
- **本指名管理**: 顧客の事前指名キャストへの自動割当
- **場内指名管理**: その場でのキャスト指名
- **バック率計算**: ドリンク・ボトル・指名別の自動計算
- **指名履歴**: 指名の記録と管理
- **昇格管理**: 場内指名から本指名への昇格

### ⏰ 勤怠・給与管理
- **出退勤記録**: 出勤・退勤・休憩時間の記録
- **勤怠承認**: 管理者による勤怠承認・修正
- **給与計算**: 月次給与の自動計算・バック率適用
- **給与明細**: 詳細な給与明細の生成・PDF出力

### 👥 顧客管理
- **顧客登録**: 新規顧客の登録・編集
- **顧客履歴**: 来店履歴・指名履歴・支払い履歴
- **VIP管理**: VIP顧客の管理・特典提供
- **指名統計**: 顧客別指名統計・分析

### 📊 売上・分析
- **日次売上**: 日次売上レポート・チャート表示
- **月次売上**: 月次売上レポート・トレンド分析
- **キャスト別実績**: キャスト別売上実績・パフォーマンス
- **在庫管理**: ボトル在庫管理・在庫アラート

### 🏢 店舗・システム管理
- **メニュー管理**: メニューアイテムの作成・編集・価格設定
- **ボトル管理**: 店舗在庫ボトルの管理・消費記録
- **スタッフ呼び出し**: 呼び出し管理・対応履歴
- **注文監視**: 注文状況の監視・スタッフ割当
- **レジ締め**: 日次レジ締め処理・売上集計

## 🛠 技術スタック

### フロントエンド
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.2.2
- **Styling**: TailwindCSS 3.3.3 + shadcn/ui
- **UI Components**: Radix UI primitives
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts for data visualization
- **State Management**: React Context API

### バックエンド（モック）
- **Data Layer**: TypeScript interfaces with mock data
- **API Simulation**: Custom API client with mock endpoints
- **State Management**: React Context API
- **Authentication**: Client-side role-based authentication

### 開発ツール
- **Package Manager**: npm/yarn
- **Linting**: ESLint with Next.js config
- **Build Tool**: Next.js built-in bundler
- **Type Checking**: TypeScript compiler

## 🏗 アーキテクチャ

### プロジェクト構造
```
nightwork-pos/
├── app/                    # Next.js App Router pages
│   ├── admin/             # 管理者機能
│   │   ├── attendance/    # 勤怠管理
│   │   ├── bottles/       # ボトル管理
│   │   ├── campaigns/     # キャンペーン管理
│   │   ├── cast-back-rates/ # バック率管理
│   │   ├── customers/     # 顧客管理
│   │   ├── menu/          # メニュー管理
│   │   ├── nominations/   # 指名管理
│   │   ├── order-monitor/ # 注文監視
│   │   ├── payroll/       # 給与管理
│   │   ├── register/      # レジ管理
│   │   ├── sales/         # 売上管理
│   │   ├── staff-calls/   # スタッフ呼び出し
│   │   └── tables/        # テーブル管理
│   ├── cast/              # キャスト機能
│   │   ├── attendance/    # 勤怠管理
│   │   ├── back-rates/    # バック率確認
│   │   ├── nominations/   # 指名管理
│   │   ├── payroll/       # 給与管理
│   │   ├── service/       # サービス管理
│   │   └── sessions/      # セッション管理
│   ├── super/             # システム管理者機能
│   │   ├── audit/         # 監査ログ
│   │   └── stores/        # 店舗管理
│   ├── table/             # テーブル機能
│   │   └── [tableId]/     # テーブル詳細
│   ├── dashboard/         # ダッシュボード
│   ├── login/             # ログイン
│   └── page.tsx           # ランディングページ
├── components/            # 再利用可能コンポーネント
│   ├── ui/               # ベースUIコンポーネント
│   ├── auth/             # 認証コンポーネント
│   ├── admin/            # 管理者コンポーネント
│   ├── super/            # システム管理者コンポーネント
│   └── common/           # 共通コンポーネント
├── lib/                  # ライブラリ・ユーティリティ
│   ├── auth.ts           # 認証システム
│   ├── table-auth.ts     # テーブル認証
│   ├── cast-back-system.ts # バック率システム
│   ├── nomination-system.ts # 指名システム
│   ├── customer-nomination-system.ts # 顧客指名管理
│   ├── order-monitoring-system.ts # 注文監視
│   ├── staff-call-system.ts # スタッフ呼び出し
│   ├── payroll-calculator.ts # 給与計算
│   ├── mock-data.ts      # モックデータ
│   ├── validation.ts     # バリデーション
│   └── utils.ts          # ユーティリティ
└── hooks/                # カスタムフック
    └── use-toast.ts      # トーストフック
```

### データフローアーキテクチャ
```
ユーザーインターフェース (React Components)
    ↓
コンテキストプロバイダー (Session, Notifications)
    ↓
APIクライアント (Mock Data Layer)
    ↓
データモデル (TypeScript Interfaces)
    ↓
モックデータストア (In-memory data)
```

## 🚀 インストール

### 前提条件
- Node.js 18+ 
- npm または yarn パッケージマネージャー

### セットアップ手順

1. **リポジトリのクローン**
   ```bash
   git clone <repository-url>
   cd nightwork-pos
   ```

2. **依存関係のインストール**
   ```bash
   npm install
   # または
   yarn install
   ```

3. **開発サーバーの起動**
   ```bash
   npm run dev
   # または
   yarn dev
   ```

4. **ブラウザで開く**
   [http://localhost:3000](http://localhost:3000) にアクセス

### 本番用ビルド
```bash
npm run build
npm start
```

## 📖 使用方法

### 役割別アクセス

#### 🍷 テーブルログイン
- **テーブル選択**: 利用可能なテーブルの選択
- **顧客選択**: 本指名顧客またはフリー顧客の選択
- **注文管理**: メニュー選択・キャスト選択・注文入力
- **指名管理**: 本指名・場内指名の管理
- **サービス注文**: おしぼり・灰皿交換・スタッフ呼び出し

#### 👨‍💼 キャスト
- **勤怠管理**: 出退勤記録・勤怠状況確認
- **給与確認**: 給与明細・バック率確認・指名サマリー
- **指名管理**: 本指名顧客管理・指名統計・昇格管理
- **サービス管理**: サービス注文対応・スタッフ呼び出し対応
- **セッション管理**: セッション詳細・注文履歴・会計処理

#### 👨‍💻 管理者
- **顧客管理**: 顧客登録・編集・履歴確認・VIP管理
- **指名管理**: 指名統計・昇格管理・本指名変更
- **売上管理**: 日次・月次売上確認・レポート生成
- **メニュー管理**: メニューアイテムの作成・編集・価格設定
- **ボトル管理**: 店舗在庫ボトルの管理・消費記録
- **勤怠承認**: 勤怠データの確認・承認・修正
- **給与プレビュー**: 給与計算・修正・確定
- **システム設定**: バック率設定・メニュー管理・店舗設定

#### 🔧 システム管理者
- **店舗管理**: 店舗登録・設定管理・設定テンプレート配布
- **監査ログ**: システム操作ログの表示・分析・エクスポート
- **ユーザー管理**: 全ユーザーの権限管理
- **システム設定**: グローバル設定・テンプレート管理

### 主要ワークフロー

#### テーブルログイン注文フロー
1. テーブルログイン選択
2. テーブル選択・顧客選択
3. メニュー選択・キャスト選択
4. 注文作成・カート確認
5. 指名管理・サービス注文
6. セッション終了

#### キャスト勤務フロー
1. キャストログイン
2. 出勤記録・勤怠状況確認
3. テーブル監視・顧客サポート
4. サービス注文対応
5. 指名管理・バック率確認
6. 退勤記録

#### 管理者運営フロー
1. 管理者ログイン
2. ダッシュボード確認
3. 顧客管理・指名管理
4. 売上確認・レポート生成
5. システム設定・メンテナンス

## 🔌 API仕様

### 主要エンドポイント（モック実装）

#### 認証
```typescript
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me
```

#### テーブル
```typescript
GET /api/v1/tables
PATCH /api/v1/tables/:id
POST /api/v1/tables/:id/reserve
```

#### 注文
```typescript
GET /api/v1/orders
POST /api/v1/orders
PATCH /api/v1/orders/:id
GET /api/v1/orders/:id/items
```

#### 顧客
```typescript
GET /api/v1/customers
POST /api/v1/customers
GET /api/v1/customers/:id
PATCH /api/v1/customers/:id
```

#### キャスト
```typescript
GET /api/v1/cast
GET /api/v1/cast/:id/attendance
POST /api/v1/cast/:id/clock-in
POST /api/v1/cast/:id/clock-out
```

### データモデル

#### 店舗インターフェース
```typescript
interface Store {
  id: string;
  name: string;
  tax_bp: number;           // 税率（ベーシスポイント）
  service_charge_bp: number; // サービス料率
  closing_time: string;
  created_at: string;
  updated_at: string;
}
```

#### テーブルシートインターフェース
```typescript
interface TableSeat {
  id: string;
  store_id: string;
  label: string;
  capacity: number;
  active: boolean;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning';
  area?: string;            // メインフロア、VIP、カウンター、個室
  last_updated?: string;
  session_start?: string;
  estimated_checkout?: string;
  customer_name?: string;
  staff_assigned?: string;
  note?: string;
}
```

#### サービスセッションインターフェース
```typescript
interface ServiceSession {
  id: string;
  store_id: string;
  business_date: string;
  table_seat_id: string;
  customer_id?: string;
  opened_at: string;
  closed_at?: string;
  status: 'open' | 'settled' | 'void';
  participating_casts: SessionCast[];
}

interface SessionCast {
  staff_id: string;
  joined_at: string;
  left_at?: string;
  is_primary: boolean;
}
```

## 🗄 データベーススキーマ

### 主要エンティティ

#### 店舗
- 独立した設定を持つ主要ビジネス単位
- 税率、サービス料、営業パラメータ
- 複数店舗対応と中央管理

#### テーブル
- 容量とステータス追跡を持つ物理座席エリア
- エリア別組織（メイン、VIP、カウンター、個室）
- リアルタイムステータス更新とセッション管理

#### 顧客
- 連絡先情報と設定を持つ顧客プロファイル
- 来店履歴、支出パターン、サービスリクエスト
- サービス注文追跡と顧客インタラクション

#### キャスト
- 役割と権限を持つ従業員プロファイル
- 勤怠追跡とパフォーマンス指標
- 自動計算による給与統合

#### セッション
- テーブルベースの顧客サービスセッション
- マルチキャスト参加サポート
- 継続時間追跡と請求管理
- キオスク経由の自動セッション作成

#### 注文
- キオスクからのテーブルベース顧客注文
- 注文アイテムごとのオプションキャスト指名
- 税計算と支払い処理
- ステータス追跡と確認ワークフロー

#### メニューアイテム
- カテゴリと価格を持つ商品カタログ
- 税カテゴリとサービス料適用性
- 画像サポートとSKU管理

#### ボトル（店舗在庫）
- 店舗全体の在庫管理システム
- リアルタイム在庫レベル追跡と監視
- 有効期限管理とアラート
- ボトルステータス: アクティブ、空、期限切れ
- 在庫不足通知（残量20%以下）

## 🧩 コンポーネント構造

### UIコンポーネント（shadcn/ui）
- **Button**: 様々なボタンスタイルと状態
- **Card**: ヘッダーとアクションを持つコンテンツコンテナ
- **Dialog**: フォームと確認用のモーダルダイアログ
- **Form**: バリデーション付きフォームコンポーネント
- **Table**: ソートとフィルタリング機能付きデータテーブル
- **Badge**: ステータスインジケーターとラベル
- **Input**: 様々なタイプのフォーム入力
- **Select**: ドロップダウン選択
- **Tabs**: タブインターフェース
- **Toast**: 通知システム

### カスタムコンポーネント

#### 認証
- `LoginModal`: マルチロールログインインターフェース
- `RoleGate`: ロールベースアクセス制御

#### キャストコンポーネント
- `CustomerRegistrationModal`: 顧客プロファイル作成と管理
- `CustomerHistoryModal`: 顧客来店履歴と詳細
- `ServiceOrderPage`: スタッフ呼び出しとサービスリクエストシステム
- `CastNominationModal`: 顧客指名と割り当て

#### 管理者コンポーネント
- `CustomerRegistrationModal`: 顧客プロファイル作成
- `CustomerHistoryModal`: 顧客来店履歴
- `MenuItemModal`: メニューアイテム管理
- `BottleModal`: 店舗在庫管理インターフェース
- `AttendanceReviewPage`: スタッフ勤怠承認と取り消し
- `PayrollPreviewPage`: 給与計算と修正

#### スーパー管理者コンポーネント
- `StoreRegistrationModal`: 店舗作成と設定
- `StoreDetailsModal`: 店舗情報表示
- `SettingsTemplateModal`: 設定テンプレート管理

## 🔐 認証・権限管理

### ロールベースアクセス制御

#### テーブルログイン
- テーブルでの注文・指名・サービス注文
- セッション管理・顧客情報表示

#### キャストロール
- 顧客管理とサービス
- テーブル管理と注文処理
- セッション追跡と顧客サービス
- 個人勤怠と給与アクセス

#### 管理者ロール
- メニュー管理とシステム設定
- 売上レポートと分析
- キャストパフォーマンス監視
- 顧客管理と指名管理

#### システム管理者ロール
- システム全体の設定
- 店舗管理とユーザー管理
- 監査ログとビジネスインテリジェンス

### 認証フロー
1. テーブルログイン、キャスト、管理者、システム管理者がログイン時に役割を選択
2. システムがスタッフデータベースに対して認証情報を検証
3. 適切な権限を持つ役割ベースダッシュボードアクセス
4. 役割に基づくコンテキスト対応ナビゲーションと機能

## 📱 レスポンシブデザイン

### モバイルファーストアプローチ
- **ブレークポイント**: sm (640px), md (768px), lg (1024px), xl (1280px)
- **グリッドシステム**: 適応的列を持つレスポンシブグリッドレイアウト
- **タイポグラフィ**: デバイス間でスケーラブルなテキストサイズ
- **タッチターゲット**: モバイルインタラクション用の最小44px

### レスポンシブ機能
- **適応ヘッダー**: 折りたたみ可能なナビゲーションとレスポンシブブランディング
- **フレキシブルグリッド**: 画面サイズに基づく1-4列レイアウト
- **モバイルナビゲーション**: タッチフレンドリーなボタンとジェスチャー
- **コンテンツ優先順位**: すべてのデバイスで重要な情報を表示

### カスタムユーティリティ
```css
/* クリーンなモバイルスクロール用スクロールバー非表示 */
.scrollbar-hide

/* 微妙なスクロール用の細いスクロールバー */
.scrollbar-thin

/* レスポンシブスペーシングパターン */
py-4 sm:py-8
gap-4 sm:gap-6
mb-6 sm:mb-8
```

## 🛠 開発

### 開発コマンド
```bash
# 開発サーバー起動
npm run dev

# 本番用ビルド
npm run build

# 本番サーバー起動
npm start

# リンティング実行
npm run lint
```

### コード構造ガイドライン
- **コンポーネント**: TypeScriptを使用した関数コンポーネント
- **状態管理**: グローバル状態用のReact Context
- **スタイリング**: TailwindCSSユーティリティクラス
- **型安全性**: 厳密なTypeScript設定
- **パフォーマンス**: Next.js最適化機能

### ベストプラクティス
- **コンポーネント構成**: プロパティを持つ再利用可能コンポーネント
- **型安全性**: 厳密なTypeScriptインターフェース
- **パフォーマンス**: 遅延読み込みとコード分割
- **アクセシビリティ**: ARIAラベルとキーボードナビゲーション
- **レスポンシブデザイン**: モバイルファーストアプローチ

## 🚀 デプロイ

### 本番ビルド
```bash
# 最適化ビルド作成
npm run build

# 本番サーバー起動
npm start
```

### 環境変数
```env
NEXT_PUBLIC_API_URL=your-api-url
NEXT_PUBLIC_APP_NAME=NightWork POS
```

### デプロイプラットフォーム
- **Vercel**: Next.jsアプリケーションに推奨
- **Netlify**: 静的サイトデプロイ
- **AWS**: コンテナベースデプロイ
- **Docker**: コンテナ化デプロイ

### パフォーマンス最適化
- **静的生成**: より良いパフォーマンスのためのプリレンダリングページ
- **画像最適化**: Next.js自動画像最適化
- **コード分割**: 自動バンドル分割
- **キャッシング**: 静的アセットキャッシングとCDNサポート

## 📈 将来の拡張

### 計画機能
- **リアルタイム更新**: ライブ更新用WebSocket統合
- **決済統合**: Stripe/PayPal決済処理
- **在庫管理**: 在庫追跡とアラート
- **高度な分析**: 機械学習インサイト
- **モバイルアプリ**: React Nativeコンパニオンアプリ
- **API統合**: バックエンドサービス統合
- **多言語サポート**: 国際化（i18n）
- **高度なレポート**: カスタムレポートビルダー
- **顧客ロイヤルティ**: ポイントとリワードシステム
- **統合API**: サードパーティサービス統合

### 技術的改善
- **データベース統合**: PostgreSQL/MongoDBバックエンド
- **認証**: JWT/OAuth2実装
- **リアルタイム機能**: Socket.io統合
- **テスト**: JestとReact Testing Library
- **CI/CD**: 自動テストとデプロイ
- **パフォーマンス**: オフラインサポート用Service Worker
- **セキュリティ**: 強化されたセキュリティ対策
- **監視**: アプリケーションパフォーマンス監視

## 🔧 設定

### 環境セットアップ
```bash
# 開発
NODE_ENV=development
NEXT_PUBLIC_APP_NAME=NightWork POS
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# 本番
NODE_ENV=production
NEXT_PUBLIC_APP_NAME=NightWork POS
NEXT_PUBLIC_API_URL=https://your-api-domain.com
```

### TailwindCSS設定
```typescript
// tailwind.config.ts
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // カスタムカラーパレット
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
```

## 🧪 テスト

### テスト構造
```
tests/
├── components/          # コンポーネントテスト
├── pages/              # ページテスト
├── lib/                # ユーティリティテスト
├── integration/        # 統合テスト
└── e2e/               # エンドツーエンドテスト
```

### テストコマンド
```bash
# 全テスト実行
npm test

# ウォッチモードでテスト実行
npm run test:watch

# カバレッジ付きテスト実行
npm run test:coverage

# E2Eテスト実行
npm run test:e2e
```

## 📊 パフォーマンス

### 最適化戦略
- **コード分割**: Next.jsによる自動バンドル分割
- **画像最適化**: Next.js自動画像最適化
- **静的生成**: より良いパフォーマンスのためのプリレンダリングページ
- **キャッシング**: 静的アセットキャッシングとCDNサポート
- **遅延読み込み**: コンポーネントとルートベースの遅延読み込み

### パフォーマンス指標
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **First Input Delay**: < 100ms

## 🔒 セキュリティ

### セキュリティ対策
- **入力検証**: Zodスキーマ検証
- **XSS保護**: Reactの組み込みXSS保護
- **CSRF保護**: Next.js CSRF保護
- **コンテンツセキュリティポリシー**: 厳密なCSPヘッダー
- **HTTPS強制**: セキュアな通信

### ベストプラクティス
- **環境変数**: セキュアな設定管理
- **認証**: ロールベースアクセス制御
- **データ検証**: サーバーサイドとクライアントサイド検証
- **エラーハンドリング**: セキュアなエラーメッセージ
- **ログ**: セキュリティイベントの監査証跡

## 📱 モバイル最適化

### プログレッシブウェブアプリ（PWA）
- **オフラインサポート**: オフライン機能用Service Worker
- **アプリライク体験**: ネイティブアプリライクインターフェース
- **プッシュ通知**: リアルタイム通知
- **インストールプロンプト**: ホーム画面への追加機能

### モバイル特化機能
- **タッチジェスチャー**: スワイプとタップインタラクション
- **レスポンシブ画像**: モバイル帯域幅に最適化
- **高速読み込み**: モバイルネットワークに最適化
- **バッテリー最適化**: 効率的な電力使用

## 🌐 国際化

### 多言語サポート
```typescript
// i18n設定
const i18n = {
  defaultLocale: 'ja',
  locales: ['ja', 'en', 'zh'],
  domains: [
    {
      domain: 'nightwork-pos.com',
      defaultLocale: 'ja',
    },
  ],
}
```

### 翻訳構造
```
locales/
├── ja/                 # 日本語翻訳
├── en/                 # 英語翻訳
└── zh/                 # 中国語翻訳
```

## 🔄 状態管理

### コンテキストプロバイダー
```typescript
// セッション管理
const SessionContext = createContext<SessionContextType>();

// 通知システム
const NotificationContext = createContext<NotificationContextType>();

// 認証
const AuthContext = createContext<AuthContextType>();
```

### 状態パターン
- **グローバル状態**: アプリ全体の状態用React Context
- **ローカル状態**: コンポーネント固有の状態用useState
- **サーバー状態**: APIシミュレーション用モックデータレイヤー
- **フォーム状態**: フォーム管理用React Hook Form

## 📈 分析・監視

### ユーザー分析
- **ページビュー**: ユーザーナビゲーションパターンの追跡
- **ユーザー行動**: 機能使用の監視
- **パフォーマンス**: アプリケーションパフォーマンスの追跡
- **エラー**: エラーの監視と報告

### ビジネス分析
- **売上指標**: 収益と取引の追跡
- **顧客インサイト**: 顧客行動分析
- **スタッフパフォーマンス**: 従業員生産性指標
- **運用データ**: ビジネス運用インサイト

## 🚀 デプロイ戦略

### ステージング環境
```bash
# ステージングにデプロイ
npm run build:staging
npm run deploy:staging
```

### 本番環境
```bash
# 本番にデプロイ
npm run build:production
npm run deploy:production
```

### ブルーグリーンデプロイ
- **ゼロダウンタイム**: シームレスなデプロイプロセス
- **ロールバック機能**: 前のバージョンへの迅速なロールバック
- **ヘルスチェック**: 自動ヘルス監視
- **ロードバランシング**: トラフィック分散

## 🔧 メンテナンス

### 定期タスク
- **依存関係更新**: パッケージを最新に保つ
- **セキュリティパッチ**: セキュリティ更新の適用
- **パフォーマンス監視**: アプリケーションパフォーマンスの監視
- **バックアップ管理**: 定期的なデータバックアップ
- **ログ管理**: ログローテーションと分析

### トラブルシューティング

#### 一般的な問題
1. **ビルド失敗**: TypeScriptエラーと依存関係をチェック
2. **パフォーマンス問題**: バンドルサイズと読み込み時間を監視
3. **レスポンシブ問題**: 様々なデバイスと画面サイズでテスト
4. **認証問題**: ロールベースアクセス制御を確認

#### デバッグコマンド
```bash
# TypeScriptエラーをチェック
npx tsc --noEmit

# バンドルサイズを分析
npm run analyze

# アクセシビリティ問題をチェック
npm run a11y

# パフォーマンス監査を実行
npm run lighthouse
```

## 🤝 貢献

### 開発セットアップ
1. リポジトリをフォーク
2. 機能ブランチを作成（`git checkout -b feature/amazing-feature`）
3. 変更を加える
4. 該当する場合はテストを追加
5. 変更をコミット（`git commit -m 'Add amazing feature'`）
6. ブランチにプッシュ（`git push origin feature/amazing-feature`）
7. プルリクエストを開く

### コード標準
- **TypeScript**: 厳密な型チェック有効
- **ESLint**: コード品質強制
- **Prettier**: コードフォーマット
- **Conventional Commits**: 標準化されたコミットメッセージ
- **コードレビュー**: すべての変更にレビューが必要

### プルリクエストガイドライン
- **明確な説明**: 変更と理由を説明
- **テスト**: 新機能にテストを含める
- **ドキュメント**: 必要に応じてドキュメントを更新
- **スクリーンショット**: UI変更にスクリーンショットを含める

## 📄 ライセンス

このプロジェクトはMITライセンスの下でライセンスされています。詳細は[LICENSE](LICENSE)ファイルを参照してください。

### ライセンス条項
- **商用利用**: 許可
- **修正**: 許可
- **配布**: 許可
- **私的使用**: 許可
- **責任**: 限定
- **保証**: なし

## 🆘 サポート

### ヘルプの取得
- **ドキュメント**: インラインコードコメントとこのREADMEを確認
- **Issues**: バグや機能リクエスト用にGitHubでissueを作成
- **Discussions**: 質問やアイデア用にGitHub Discussionsを使用
- **Wiki**: 詳細ガイド用にプロジェクトwikiを確認

### コミュニティ
- **Discord**: リアルタイムサポート用にDiscordサーバーに参加
- **Email**: support@nightwork-pos.comでお問い合わせ
- **FAQ**: よくある質問を確認

### 問題の報告
問題を報告する際は、以下を含めてください：
- **環境**: OS、ブラウザ、Node.jsバージョン
- **再現手順**: 問題を再現する明確な手順
- **期待される動作**: 期待していた動作
- **実際の動作**: 実際に起こったこと
- **スクリーンショット**: 該当する場合は視覚的証拠

## 🆕 最近の更新

### Version 3.0.0 - キャバクラ特化統合POSシステム

#### 🍷 テーブルファーストシステム実装
- **テーブルベース注文**: キャストがテーブルで注文を管理
- **自動セッション管理**: テーブル利用時に自動的にセッション作成
- **デバイスバインディング**: localStorageトークンによる安定したテーブル-デバイスバインディング
- **キャスト指名**: 注文アイテムごとのオプションキャスト選択
- **マルチキャストセッション**: テーブルセッションあたり複数キャストサポート

#### 🔄 ワークフロー変革
- **キャスト主導注文**: キャストが注文を管理し、指名・サービス注文まで完結
- **指名システム**: 本指名・場内指名の完全サポート
- **バック率計算**: ドリンク・ボトル・指名別の自動計算
- **統合管理**: 勤怠・給与・売上・顧客の一元管理

#### 🏗️ アーキテクチャ更新
- **SessionContext統合**: すべてのコンポーネント間での中央集権的セッション管理
- **テーブルファーストデータモデル**: 注文とセッションがキャストではなくテーブルに紐づけ
- **テーブル特化レイアウト**: 顧客使用用の簡素化インターフェース
- **ロールベースアクセス**: 新しいワークフロー用の権限更新

#### 🐛 技術的改善
- **TypeScript準拠**: すべての型エラーとインターフェース不一致を修正
- **ビルド最適化**: コンパイル問題を解決し、ビルドパフォーマンスを改善
- **データ一貫性**: すべてのコンポーネントで一貫したデータ構造を使用
- **レスポンシブデザイン**: モバイルとタブレット互換性を強化

### 以前のバージョン
- **Version 2.1.0**: ボトル管理の大幅な改善による管理機能の強化
- **Version 2.0.0**: 初期キャスト中心システム実装

## 🙏 謝辞

### オープンソースライブラリ
- **Next.js**: 本番用Reactフレームワーク
- **TailwindCSS**: ユーティリティファーストCSSフレームワーク
- **shadcn/ui**: 美しくアクセシブルなコンポーネント
- **Radix UI**: スタイルなし、アクセシブルなUIプリミティブ
- **Lucide React**: 美しく一貫したアイコンツールキット

### 貢献者
- **開発チーム**: コア開発チーム
- **デザインチーム**: UI/UXデザインと実装
- **テストチーム**: 品質保証とテスト
- **コミュニティ**: オープンソース貢献者

---

## 📞 お問い合わせ

- **Website**: [https://nightwork-pos.com](https://nightwork-pos.com)
- **Email**: info@nightwork-pos.com
- **Twitter**: [@NightWorkPOS](https://twitter.com/NightWorkPOS)
- **LinkedIn**: [NightWork POS](https://linkedin.com/company/nightwork-pos)

---

**NightWork POS** - モダンなテクノロジーと直感的な管理ツールでナイトライフビジネスを支援。🍷✨
