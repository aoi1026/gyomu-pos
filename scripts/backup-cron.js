/**
 * 2分ごとにデータベースをバックアップするスクリプト
 * このスクリプトは別プロセスとして実行する必要があります
 * 
 * 実行方法:
 * node scripts/backup-cron.js
 * 
 * または、pm2などのプロセスマネージャーを使用:
 * pm2 start scripts/backup-cron.js
 */

const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;

const execAsync = promisify(exec);

// 環境変数からデータベース接続情報を取得
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'cabaclub_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

const BACKUP_DIR = path.join(process.cwd(), 'backup');
const MAX_BACKUP_FILES = 2;

// バックアップディレクトリの存在確認と作成
async function ensureBackupDir() {
  try {
    await fs.access(BACKUP_DIR);
  } catch {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  }
}

// データベースバックアップを実行
async function createBackup() {
  try {
    await ensureBackupDir();
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
    const filename = `backup_${timestamp}.sql`;
    const filepath = path.join(BACKUP_DIR, filename);

    // pg_dumpコマンドを実行（プレーンテキスト形式で出力）
    const pgDumpCommand = `pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -F p -f "${filepath}"`;
    
    // パスワードを環境変数として設定
    const env = {
      ...process.env,
      PGPASSWORD: dbConfig.password,
    };

    await execAsync(pgDumpCommand, { env });

    // 古いバックアップファイルを削除（最新2ファイルのみ保持）
    await cleanupOldBackups();

    return { success: true, filename };
  } catch (err) {
    console.error('バックアップエラー:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'バックアップに失敗しました' 
    };
  }
}

// 古いバックアップファイルを削除（最新2ファイルのみ保持）
async function cleanupOldBackups() {
  try {
    await ensureBackupDir();
    
    const files = await fs.readdir(BACKUP_DIR);
    const backupFiles = files
      .filter(file => file.startsWith('backup_') && file.endsWith('.sql'))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_DIR, file),
      }));

    // ファイル名でソート（新しい順）
    backupFiles.sort((a, b) => b.name.localeCompare(a.name));

    // 最新2ファイルを除いて削除
    if (backupFiles.length > MAX_BACKUP_FILES) {
      const filesToDelete = backupFiles.slice(MAX_BACKUP_FILES);
      for (const file of filesToDelete) {
        await fs.unlink(file.path);
        console.log(`古いバックアップファイルを削除: ${file.name}`);
      }
    }
  } catch (err) {
    console.error('バックアップファイルクリーンアップエラー:', err);
  }
}

async function runBackup() {
  console.log(`[${new Date().toISOString()}] バックアップを開始します...`);
  const result = await createBackup();
  
  if (result.success) {
    console.log(`[${new Date().toISOString()}] バックアップが完了しました: ${result.filename}`);
  } else {
    console.error(`[${new Date().toISOString()}] バックアップに失敗しました: ${result.error}`);
  }
}

// 初回実行
runBackup();

// 2分ごとに実行（120000ミリ秒 = 2分）
setInterval(runBackup, 7200000);

console.log('バックアップスクリプトが開始されました。2分ごとにバックアップを実行します。');

