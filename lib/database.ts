import { Pool } from 'pg';

// 環境変数からデータベース接続情報を取得
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'cabaclub_system',
  user: process.env.DB_USER || 'postgres',
  // config.md でのデフォルトと合わせる
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // 接続プールの最大接続数
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // 10秒に延長
  statement_timeout: 30000, // クエリタイムアウト30秒
};

// PostgreSQL接続プールの設定
// NOTE: Next.js(dev)のホットリロードでPoolが多重生成されると、PostgreSQL側で
// "too many clients already" が発生しやすい。globalThisでシングルトン化する。
declare global {
  // eslint-disable-next-line no-var
  var __smartecPgPool: Pool | undefined;
}

export const pool =
  global.__smartecPgPool ?? new Pool(dbConfig);

if (process.env.NODE_ENV !== 'production') {
  global.__smartecPgPool = pool;
}

// データベース接続テスト
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('データベース接続エラー:', error);
    return false;
  }
}

// データベース接続を閉じる
export async function closeConnection(): Promise<void> {
  await pool.end();
}

// データベース設定情報を取得（デバッグ用）
export function getDbConfig() {
  return {
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user,
    ssl: dbConfig.ssl,
    max: dbConfig.max,
    idleTimeoutMillis: dbConfig.idleTimeoutMillis,
    connectionTimeoutMillis: dbConfig.connectionTimeoutMillis
  };
}
