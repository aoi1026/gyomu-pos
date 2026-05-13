import type { PoolClient } from 'pg';

/**
 * テーブルからの注文を管理者が手動承認するか。
 * project_variable `order_approval_required` が false/0/off/no のときは自動承認。
 * 未設定時は true（従来どおり承認必要）。
 */
export async function getOrderApprovalRequired(client: PoolClient): Promise<boolean> {
  try {
    const r = await client.query(
      `SELECT value FROM project_variable WHERE name = 'order_approval_required' LIMIT 1`
    );
    if (r.rows.length === 0) return true;
    const v = String(r.rows[0].value ?? 'true').trim().toLowerCase();
    if (v === 'false' || v === '0' || v === 'off' || v === 'no') return false;
    return true;
  } catch {
    return true;
  }
}
