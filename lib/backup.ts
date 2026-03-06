import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getDbConfig } from './database';

const execAsync = promisify(exec);

const BACKUP_DIR = path.join(process.cwd(), 'backup');
const MAX_BACKUP_FILES = 2;

// バックアップディレクトリの存在確認と作成
export async function ensureBackupDir(): Promise<void> {
  try {
    await fs.access(BACKUP_DIR);
  } catch {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  }
}

// データベースバックアップを実行
export async function createBackup(): Promise<{ success: boolean; filename?: string; error?: string }> {
  try {
    await ensureBackupDir();
    
    const dbConfig = getDbConfig();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
    const filename = `backup_${timestamp}.sql`;
    const filepath = path.join(BACKUP_DIR, filename);

    // pg_dumpコマンドを実行（プレーンテキスト形式で出力）
    const pgDumpCommand = `pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -F p -f "${filepath}"`;
    
    // パスワードを環境変数として設定
    const env = {
      ...process.env,
      PGPASSWORD: process.env.DB_PASSWORD || 'root',
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
export async function cleanupOldBackups(): Promise<void> {
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

// バックアップファイルリストを取得
export async function getBackupFiles(): Promise<Array<{ filename: string; size: number; created: Date }>> {
  try {
    await ensureBackupDir();
    
    const files = await fs.readdir(BACKUP_DIR);
    const backupFiles = files.filter(file => file.startsWith('backup_') && file.endsWith('.sql'));
    
    const fileList = await Promise.all(
      backupFiles.map(async (filename) => {
        const filepath = path.join(BACKUP_DIR, filename);
        const stats = await fs.stat(filepath);
        
        // ファイル名からタイムスタンプを抽出
        const timestampMatch = filename.match(/backup_(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})\.sql/);
        const created = timestampMatch 
          ? new Date(timestampMatch[1].replace(/_/g, 'T').replace(/-/g, ':'))
          : stats.birthtime;
        
        return {
          filename,
          size: stats.size,
          created,
        };
      })
    );

    // 作成日時でソート（新しい順）
    fileList.sort((a, b) => b.created.getTime() - a.created.getTime());

    return fileList;
  } catch (err) {
    console.error('バックアップファイルリスト取得エラー:', err);
    return [];
  }
}

// バックアップファイルからデータベースを復元
export async function restoreBackup(filename: string): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureBackupDir();
    
    const filepath = path.join(BACKUP_DIR, filename);
    
    // ファイルの存在確認
    try {
      await fs.access(filepath);
    } catch {
      return { success: false, error: 'バックアップファイルが見つかりません' };
    }

    const dbConfig = getDbConfig();

    // psqlコマンドでSQLファイルを実行（プレーンテキスト形式のバックアップを復元）
    // 注意: 本番環境では、既存のデータベースを削除してから復元する必要がある場合があります
    const psqlCommand = `psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -f "${filepath}"`;
    
    // パスワードを環境変数として設定
    const env = {
      ...process.env,
      PGPASSWORD: process.env.DB_PASSWORD || 'root',
    };

    await execAsync(psqlCommand, { env });

    return { success: true };
  } catch (err) {
    console.error('リストアエラー:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'データベースの復元に失敗しました' 
    };
  }
}

// CommonJS互換性のためのエクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createBackup,
    getBackupFiles,
    restoreBackup,
    cleanupOldBackups,
    ensureBackupDir
  };
}

