import type { PoolClient } from 'pg';

/** category テーブルに sort_order カラムを追加し、未設定行があれば id 順で初期化する */
export async function ensureCategorySortOrderColumn(client: PoolClient): Promise<void> {
  await client.query(`
    ALTER TABLE category
    ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0
  `);

  const distinct = await client.query(
    `SELECT COUNT(DISTINCT sort_order) AS cnt FROM category`
  );
  const distinctCount = Number(distinct.rows[0]?.cnt ?? 0);
  if (distinctCount <= 1) {
    await client.query(`
      UPDATE category c
         SET sort_order = sub.rn
        FROM (
          SELECT id, ROW_NUMBER() OVER (ORDER BY id ASC) AS rn
            FROM category
        ) sub
       WHERE c.id = sub.id
    `);
  }
}
