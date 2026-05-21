import type { PoolClient } from 'pg';
import { getBusinessDayYmd } from '@/lib/business-day';

export type LogRecordAction = '明細削除' | 'レシート印刷';

export type InsertLogRecordRow = {
  business_date: string; // YYYY-MM-DD
  table_label: string;
  action_type: LogRecordAction;
  original_amount?: number | null;
  quantity?: number | null;
  target_staff_label?: string | null;
  item_name?: string | null;
  ordered_at?: Date | string | null;
  payment_method?: string | null;
  memo?: string | null;
  session_id?: number | null;
};

/**
 * システムログ（注文明細削除・レシート印刷）用テーブル。
 * 既存 DB では起動時に CREATE IF NOT EXISTS で補完する。
 */
export async function ensureLogRecordTable(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS log_record (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      business_date DATE NOT NULL,
      table_label TEXT NOT NULL DEFAULT '',
      action_type TEXT NOT NULL CHECK (action_type IN ('明細削除', 'レシート印刷')),
      original_amount DECIMAL(12,2),
      quantity INTEGER,
      target_staff_label TEXT,
      item_name TEXT,
      ordered_at TIMESTAMPTZ,
      payment_method TEXT,
      memo TEXT,
      session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL
    )
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_log_record_business_date_id
    ON log_record (business_date DESC, id DESC)
  `);
}

export async function insertLogRecord(client: PoolClient, row: InsertLogRecordRow): Promise<void> {
  await ensureLogRecordTable(client);
  await client.query(
    `INSERT INTO log_record (
      business_date, table_label, action_type, original_amount, quantity,
      target_staff_label, item_name, ordered_at, payment_method, memo, session_id
    ) VALUES ($1::date, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      row.business_date,
      row.table_label,
      row.action_type,
      row.original_amount ?? null,
      row.quantity ?? null,
      row.target_staff_label ?? null,
      row.item_name ?? null,
      row.ordered_at ?? null,
      row.payment_method ?? null,
      row.memo ?? null,
      row.session_id ?? null,
    ]
  );
}

/** ログ記録時点の業務日（JST 6:00 境界） */
export function logBusinessDateNow(): string {
  return getBusinessDayYmd();
}
