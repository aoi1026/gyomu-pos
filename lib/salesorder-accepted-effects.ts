import type { PoolClient } from 'pg';

type SalesOrderAcceptRow = {
  id: number | string;
  product_id: number | string;
  for_cast?: number | string | null;
  cast_id?: number | string | null;
  session_id?: number | string | null;
  total_price: number | string | null | undefined;
};

/**
 * 売上注文が accepted になった瞬間の付随処理（for_cast・rank_cost・castsalary・sales_back）。
 * PATCH 承認と POST 直後の自動承認で共用する。
 */
export async function applySalesOrderAcceptedBizLogic(
  client: PoolClient,
  existing: SalesOrderAcceptRow,
  resultRow: { accepted_at?: Date | string | null }
): Promise<void> {
  const forCast = Number(existing.for_cast) === 1;
  const castId = existing.cast_id != null ? Number(existing.cast_id) : null;
  const sessId = existing.session_id != null ? Number(existing.session_id) : null;
  const price = Number(existing.total_price) || 0;
  const orderId = existing.id;

  if (!forCast || !castId || !sessId || price <= 0) return;

  try {
    await client.query(`ALTER TABLE nomination ADD COLUMN IF NOT EXISTS rank_cost DECIMAL(12,2) DEFAULT 0.00`);
    await client.query(`ALTER TABLE nomination ADD COLUMN IF NOT EXISTS tomain_nomination INTEGER DEFAULT 0`);
    await client.query(`ALTER TABLE salesorder ADD COLUMN IF NOT EXISTS castsalary_price DECIMAL(12,2) DEFAULT 0.00`);
    await client.query(`ALTER TABLE salary ADD COLUMN IF NOT EXISTS sales_back_yen DECIMAL(12,2) DEFAULT 0.00`);

    await client.query(
      `
      UPDATE nomination
         SET rank_cost = COALESCE(rank_cost, 0) + $1
       WHERE session_id = $2
         AND cast_id = $3
         AND (
           type_id IN ('main','together')
           OR (type_id = 'inside' AND COALESCE(tomain_nomination,0) = 1)
         )
      `,
      [price, sessId, castId]
    );

    const categoryRes = await client.query(`SELECT category_id FROM product WHERE id = $1`, [Number(existing.product_id)]);
    const categoryId = categoryRes.rows[0]?.category_id ? Number(categoryRes.rows[0].category_id) : null;

    let computed = price;
    if (categoryId) {
      const scRes = await client.query(
        `SELECT value FROM salary_category WHERE cast_id = $1 AND category_id = $2 ORDER BY id DESC LIMIT 1`,
        [castId, categoryId]
      );
      const vRaw = scRes.rows[0]?.value;
      const v = vRaw === null || vRaw === undefined ? null : Number(vRaw);
      if (v === null || !Number.isFinite(v)) {
        computed = price;
      } else if (v === -1) {
        computed = price;
      } else if (v >= 0 && v <= 1) {
        computed = price * v;
      } else if (v > 1) {
        computed = v;
      } else {
        computed = 0;
      }
    }

    await client.query(`UPDATE salesorder SET castsalary_price = $1 WHERE id = $2`, [computed, orderId]);

    const acceptedAt = resultRow?.accepted_at ?? null;
    const ymRes = await client.query(
      `SELECT EXTRACT(YEAR FROM $1::timestamptz)::int AS year, EXTRACT(MONTH FROM $1::timestamptz)::int AS month`,
      [acceptedAt]
    );
    const year = Number(ymRes.rows[0]?.year);
    const month = Number(ymRes.rows[0]?.month);
    const add = Number(computed) || 0;
    if (Number.isFinite(year) && Number.isFinite(month) && add > 0) {
      await client.query(
        `
        INSERT INTO salary (user_id, year, month, sales_back_yen)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, year, month)
        DO UPDATE SET sales_back_yen = COALESCE(salary.sales_back_yen, 0) + EXCLUDED.sales_back_yen
        `,
        [castId, year, month, add]
      );
    }
  } catch (e) {
    console.error('rank_cost加算エラー（承認時）:', e);
  }
}
