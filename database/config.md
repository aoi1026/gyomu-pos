# データベース設定

## 環境変数の設定

以下の環境変数を設定してください：

```bash
# データベース接続設定
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cabaclub_system
DB_USER=postgres
DB_PASSWORD=root

# 本番環境用（オプション）
DATABASE_URL=postgresql://postgres:root@localhost:5432/cabaclub_system

# アプリケーション設定
NODE_ENV=development
NEXT_PUBLIC_APP_NAME=キャバクラPOSシステム
```

## データベース接続設定の詳細

### 開発環境
- **ホスト**: localhost
- **ポート**: 5432
- **データベース名**: cabaclub_system
- **ユーザー**: postgres
- **パスワード**: root

### 本番環境
- SSL接続が有効になります
- 環境変数で設定された値を使用します

## 接続プール設定

- **最大接続数**: 20
- **アイドルタイムアウト**: 30秒
- **接続タイムアウト**: 2秒

## 使用方法

```typescript
import { pool, testConnection } from '@/lib/database';

// データベース接続テスト
const isConnected = await testConnection();

// データベースクエリ実行
const client = await pool.connect();
try {
  const result = await client.query('SELECT * FROM users');
  return result.rows;
} finally {
  client.release();
}
```
