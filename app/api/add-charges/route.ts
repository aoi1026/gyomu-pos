const DEFAULT_CHARGES = [
  { name: 'main', label: '本指名料' },
  { name: 'inside', label: '場内指名料' },
  { name: 'together', label: '同伴料' },
  { name: 'bottle_keep', label: 'ボトル保管料' },
  { name: 'song_room', label: 'カラオケ利用料' },
  // 要件: セット料金/延長料金は add_charges の「charge_nameがset_price/extension_priceの行」の value を参照する
  { name: 'set_price', label: 'セット料金' },
  { name: 'extension_price', label: '延長料金' },
];

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';


async function ensureAddChargesTable(client: any) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS add_charges (
      id SERIAL PRIMARY KEY,
      charge_name VARCHAR(100) UNIQUE NOT NULL,
      value DECIMAL(10,2) DEFAULT 0.00 CHECK (value >= 0),
      other TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_add_charges_name ON add_charges(charge_name)
  `);

  const insertValues = DEFAULT_CHARGES.map(
    charge => `('${charge.name}', 0.00, NULL)`
  ).join(', ');

  await client.query(`
    INSERT INTO add_charges (charge_name, value, other)
    VALUES ${insertValues}
    ON CONFLICT (charge_name) DO NOTHING
  `);
}

export async function GET() {
  const client = await pool.connect();
  try {
    await ensureAddChargesTable(client);

    const result = await client.query(
      `SELECT id, charge_name, value, other, created_at, updated_at FROM add_charges ORDER BY id`
    );

    return NextResponse.json({ success: true, charges: result.rows });
  } catch (error) {
    console.error('追加料金取得エラー:', error);
    return NextResponse.json(
      { success: false, error: '追加料金の取得に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function PUT(request: NextRequest) {
  const client = await pool.connect();
  try {
    await ensureAddChargesTable(client);
    const { chargeName, value, other } = await request.json();

    if (!chargeName) {
      return NextResponse.json(
        { success: false, error: 'chargeNameが必要です' },
        { status: 400 }
      );
    }

    if (value !== undefined && (typeof value !== 'number' || value < 0)) {
      return NextResponse.json(
        { success: false, error: 'valueは0以上の数値を指定してください' },
        { status: 400 }
      );
    }

    const updates: string[] = [];
    const params: any[] = [];
    let index = 1;

    if (value !== undefined) {
      updates.push(`value = $${index++}`);
      params.push(value);
    }

    if (other !== undefined) {
      updates.push(`other = $${index++}`);
      params.push(other);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: '更新項目がありません' },
        { status: 400 }
      );
    }

    params.push(chargeName);
    const query = `UPDATE add_charges SET ${updates.join(', ')} WHERE charge_name = $${index} RETURNING *`;
    const result = await client.query(query, params);

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: '対象の追加料金項目が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, charge: result.rows[0] });
  } catch (error) {
    console.error('追加料金更新エラー:', error);
    return NextResponse.json(
      { success: false, error: '追加料金の更新に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

