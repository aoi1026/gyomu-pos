/**
 * 2分ごとにデータベースをバックアップするスクリプト
 * このスクリプトは別プロセスとして実行する必要があります
 * 
 * 実行方法（推奨）:
 * node scripts/backup-cron.js
 * 
 * または、pm2などのプロセスマネージャーを使用:
 * pm2 start scripts/backup-cron.js
 * 
 * TypeScript版を使用する場合:
 * npx tsx scripts/backup-cron.ts
 */

import { createBackup } from '../lib/backup';

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

