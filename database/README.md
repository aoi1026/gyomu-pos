# データベース設定

## 概要
このディレクトリには、キャバクラシステム用のPostgreSQLデータベーススキーマと初期データが含まれています。

## ファイル構成
- `schema.sql`: データベーステーブルの定義
- `init.sql`: 初期データの挿入
- `README.md`: このファイル

## テーブル構成

### `table` テーブル
店舗のテーブル情報を管理します。

| カラム名 | 型 | 制約 | 説明 |
|---------|----|----|----|
| id | SERIAL | PRIMARY KEY | テーブルID |
| name | VARCHAR(100) | NOT NULL | テーブル名 |
| capacity | INTEGER | NOT NULL, CHECK > 0 | 収容人数 |
| other | TEXT | - | その他の情報 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 更新日時 |

### `user` テーブル
ユーザー（キャスト、管理者）情報を管理します。

| カラム名 | 型 | 制約 | 説明 |
|---------|----|----|----|
| id | SERIAL | PRIMARY KEY | ユーザーID |
| name | VARCHAR(100) | NOT NULL | ユーザー名 |
| mail | VARCHAR(255) | UNIQUE, NOT NULL | メールアドレス |
| password | VARCHAR(255) | NOT NULL | パスワード（MD5ハッシュ化済み） |
| role | VARCHAR(50) | CHECK IN ('admin', 'cast', 'manager') | ロール |
| drink_back | DECIMAL(5,2) | DEFAULT 0.00, CHECK 0-100 | ドリンクバック率（%） |
| food_back | DECIMAL(5,2) | DEFAULT 0.00, CHECK 0-100 | フードバック率（%） |
| main_nomination | DECIMAL(5,2) | DEFAULT 0.00, CHECK 0-100 | メイン指名率（%） |
| inside_nomination | DECIMAL(5,2) | DEFAULT 0.00, CHECK 0-100 | インサイド指名率（%） |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 更新日時 |

## 初期設定

### 管理者アカウント
- メール: admin@example.com
- パスワード: AdminPassword@123（MD5ハッシュ: eb5eb52d7efb07d90d05fcf5c7516fe5）
- ロール: admin

## セットアップ手順

1. PostgreSQLをインストール・起動
2. データベースを作成
   ```sql
   CREATE DATABASE cabaclub_system;
   ```
3. 環境変数を設定（env.exampleを参考に）
4. スキーマを実行
   ```bash
   psql -d cabaclub_system -f database/schema.sql
   ```
5. 初期データを挿入
   ```bash
   psql -d cabaclub_system -f database/init.sql
   ```

## パスワード暗号化について

### MD5ハッシュ化
- すべてのパスワードはMD5アルゴリズムでハッシュ化されてデータベースに保存されます
- ハッシュ化機能: `lib/database.ts`の`hashPassword()`関数
- パスワード検証機能: `lib/database.ts`の`verifyPassword()`関数
- ユーザー認証機能: `lib/database.ts`の`authenticateUser()`関数

### 使用例
```typescript
import { hashPassword, verifyPassword, authenticateUser } from '@/lib/database';

// パスワードのハッシュ化
const hashedPassword = hashPassword('plainPassword');

// パスワードの検証
const isValid = verifyPassword('plainPassword', hashedPassword);

// ユーザー認証
const authResult = await authenticateUser('admin@example.com', 'AdminPassword@123');
```

## 注意事項
- パスワードはMD5でハッシュ化されて保存されます
- SSL接続の設定を適切に行ってください
- 定期的なバックアップを設定してください
- セキュリティ要件に応じて、より強力なハッシュアルゴリズム（bcrypt等）への移行を検討してください
