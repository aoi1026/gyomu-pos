# マイグレーションガイド

## migration_complete.sql について

このファイルは、PostgreSQL 17.7 で動作する完全なデータベーススキーマとマイグレーションスクリプトです。

## 特徴

✅ **既存データベース対応**: 既にデータが存在するデータベースに対しても安全に実行可能  
✅ **新規データベース対応**: 空のデータベースから完全にセットアップ可能  
✅ **冪等性**: 複数回実行しても安全（IF NOT EXISTS や DO ブロックを使用）  
✅ **エラー耐性**: カラムやコメントの追加時にエラーが発生しても継続  

## 実行方法

### 方法1: 新規データベースを作成する場合

```bash
# 新しいデータベースを作成
createdb -U postgres cabaret_system

# マイグレーションを実行
psql -U postgres -d cabaret_system -f database/migration_complete.sql
```

### 方法2: 既存データベースに対して実行する場合

```bash
# 既存のデータベースに対してマイグレーション実行
psql -U postgres -d existing_database_name -f database/migration_complete.sql
```

**注意**: 既存データベースに対して実行する場合、以下が自動的に行われます：
- 不足しているテーブルの作成
- 不足しているカラムの追加
- 不足しているインデックスの作成
- 不足しているトリガーの作成
- 不足している外部キー制約の追加

## マイグレーション内容

### 1. トリガー関数
- `update_updated_at_column()`: 自動的に `updated_at` を更新

### 2. テーブル (23個)
- **基本テーブル**: `table`, `user`, `category`, `product`
- **セッション関連**: `sessions`, `nomination`, `bottle_keep`, `additional_services`
- **勤怠・給与**: `attendance`, `salary`, `salary_attenday`, `salary_category`, `salary_full`
- **注文管理**: `salesorder`, `serviceorder`, `services`
- **その他**: `callmanager`, `notifications`, `project_variable`, `shift`, `add_charges`

### 3. カラム追加（既存テーブル用）
- `user.attendance_status`: 出勤状態フラグ
- `user.together_nomination`: 同伴指名バック率
- `sessions.is_paused`: セッション停止フラグ
- `sessions.paused_at`: 停止開始時刻
- `sessions.paused_elapsed`: 累積停止時間

### 4. 外部キー制約
以下の外部キー制約を追加（存在しない場合のみ）：
- `bottle_keep.session_id` → `sessions.id`
- `nomination.session_id` → `sessions.id`
- `salesorder.session_id` → `sessions.id`
- `serviceorder.session_id` → `sessions.id`
- `callmanager.session_id` → `sessions.id`
- `salary_full.category_id` → `category.id`

### 5. インデックス (70+)
パフォーマンス最適化のための包括的なインデックス

### 6. トリガー (20+)
全テーブルの自動 `updated_at` 更新

### 7. 初期データ
- `add_charges`: 基本的な追加料金設定 (main, inside, together, bottle_keep, vip_room, song_room)

## トラブルシューティング

### エラー: "relation already exists"
**原因**: テーブルが既に存在する  
**対応**: 問題ありません。`IF NOT EXISTS` により既存テーブルはスキップされます。

### エラー: "column already exists"
**原因**: カラムが既に存在する  
**対応**: 問題ありません。`DO` ブロックで存在チェックを行っています。

### エラー: "constraint already exists"
**原因**: 制約が既に存在する  
**対応**: 問題ありません。外部キー制約の追加時に存在チェックを行っています。

### 権限エラー
**原因**: データベースへの権限が不足  
**対応**: 管理者権限で実行するか、適切な権限を付与してください。

```bash
# 管理者として実行
psql -U postgres -d database_name -f database/migration_complete.sql
```

## バックアップからの移行

既存のバックアップファイル (`backup/*.sql`) からデータを移行する場合：

```bash
# 1. 新しいデータベースを作成
createdb -U postgres new_database

# 2. スキーマをマイグレーション
psql -U postgres -d new_database -f database/migration_complete.sql

# 3. バックアップからデータのみをリストア（オプション）
# バックアップファイルからテーブル定義を除外してリストア
pg_restore -U postgres -d new_database --data-only backup/latest_backup.sql
```

## 開発環境での使用

開発環境でデータベースをリセットする場合：

```bash
# データベースを削除して再作成
dropdb -U postgres --if-exists cabaret_system
createdb -U postgres cabaret_system

# マイグレーションを実行
psql -U postgres -d cabaret_system -f database/migration_complete.sql
```

## 本番環境での使用

**重要**: 本番環境で実行する前に、必ずバックアップを取得してください。

```bash
# 1. バックアップを取得
pg_dump -U postgres -d production_db -F c -f backup/before_migration_$(date +%Y%m%d_%H%M%S).backup

# 2. マイグレーションを実行
psql -U postgres -d production_db -f database/migration_complete.sql

# 3. 動作確認
psql -U postgres -d production_db -c "\dt"  # テーブル一覧
psql -U postgres -d production_db -c "SELECT version();"  # PostgreSQLバージョン確認
```

## バージョン情報

- **PostgreSQL**: 17.7
- **文字エンコーディング**: UTF8
- **タイムゾーン**: WITH TIME ZONE (すべてのタイムスタンプ)
- **生成日**: 2025-12-17

## サポート

問題が発生した場合は、エラーメッセージと実行環境の情報を記録してください。

