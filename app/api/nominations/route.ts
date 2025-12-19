import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

const NOMINATION_TYPE_LABELS: Record<string, string> = {
  main: '本指名',
  inside: '場内指名',
  together: '同伴指名',
};

const VALID_NOMINATION_TYPES = Object.keys(NOMINATION_TYPE_LABELS);

async function ensureNominationTable(client: any) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS nomination (
      id SERIAL PRIMARY KEY,
      cast_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      table_id INTEGER NOT NULL REFERENCES "table"(id) ON DELETE CASCADE,
      session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      type_id VARCHAR(50) NOT NULL CHECK (type_id IN ('main','inside','together')),
      cost DECIMAL(10,2) DEFAULT 0.00 CHECK (cost >= 0),
      cost_cast DECIMAL(10,2) DEFAULT 0.00 CHECK (cost_cast >= 0),
      tomain_nomination INTEGER DEFAULT 0 CHECK (tomain_nomination IN (0, 1)),
      rank_cost DECIMAL(12,2) DEFAULT 0.00 CHECK (rank_cost >= 0),
      rank_point DECIMAL(6,2) DEFAULT 0.00 CHECK (rank_point >= 0),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 既存テーブルに対して不足しているカラムを追加
  await client.query(`
    ALTER TABLE nomination
      ADD COLUMN IF NOT EXISTS cost_cast DECIMAL(10,2) DEFAULT 0.00
  `);
  await client.query(`
    ALTER TABLE nomination
      ADD COLUMN IF NOT EXISTS tomain_nomination INTEGER DEFAULT 0
  `);
  await client.query(`
    ALTER TABLE nomination
      ADD COLUMN IF NOT EXISTS rank_cost DECIMAL(12,2) DEFAULT 0.00
  `);
  await client.query(`
    ALTER TABLE nomination
      ADD COLUMN IF NOT EXISTS rank_point DECIMAL(6,2) DEFAULT 0.00
  `);

  await client.query(`CREATE INDEX IF NOT EXISTS idx_nomination_cast_id ON nomination(cast_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_nomination_table_id ON nomination(table_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_nomination_session_id ON nomination(session_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_nomination_type_id ON nomination(type_id)`);
}

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    await ensureNominationTable(client);
    const { searchParams } = new URL(request.url);
    const tableId = searchParams.get('table_id');
    const sessionId = searchParams.get('session_id');

    const conditions: string[] = [];
    const params: any[] = [];
    let index = 1;

    if (tableId) {
      conditions.push(`n.table_id = $${index++}`);
      params.push(tableId);
    }
    if (sessionId) {
      conditions.push(`n.session_id = $${index++}`);
      params.push(sessionId);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await client.query(
      `
        SELECT 
          n.id,
          n.cast_id,
          u.name AS cast_name,
          n.table_id,
          n.session_id,
          n.type_id,
          n.cost,
          n.cost_cast,
          n.tomain_nomination,
          n.rank_cost,
          n.rank_point,
          n.created_at,
          n.updated_at
        FROM nomination n
        INNER JOIN "user" u ON u.id = n.cast_id
        ${whereClause}
        ORDER BY n.created_at DESC
      `,
      params
    );

    const nominations = result.rows.map((row: any) => ({
      ...row,
      type_label: NOMINATION_TYPE_LABELS[row.type_id] || row.type_id,
    }));

    return NextResponse.json({ success: true, nominations });
  } catch (error) {
    console.error('指名取得エラー:', error);
    return NextResponse.json(
      { success: false, error: '指名情報の取得に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    await ensureNominationTable(client);
    const { castId, tableId, sessionId, typeId, cost } = await request.json();

    if (!castId || !tableId || !sessionId || !typeId) {
      return NextResponse.json(
        { success: false, error: 'castId, tableId, sessionId, typeId は必須です' },
        { status: 400 }
      );
    }

    if (!VALID_NOMINATION_TYPES.includes(typeId)) {
      return NextResponse.json(
        { success: false, error: 'typeId が不正です' },
        { status: 400 }
      );
    }

    const costValue = cost !== undefined ? parseFloat(cost) : 0;
    const tomainNomination = 0; // 初期値は0

    // セッション情報（人数・延長履歴）と追加料金を取得してrank初期値を算出する
    const sessionRes = await client.query(
      `SELECT client, set_extensions FROM sessions WHERE id = $1`,
      [sessionId]
    );
    const sessionRow = sessionRes.rows[0] || {};
    const sessionClient = Number(sessionRow.client ?? 0) || 0;
    let setExtensions: any[] = [];
    try {
      const raw = sessionRow.set_extensions;
      setExtensions = typeof raw === 'string' ? JSON.parse(raw) : (raw ?? []);
      if (!Array.isArray(setExtensions)) setExtensions = [];
    } catch {
      setExtensions = [];
    }
    const extensionCount = setExtensions.length;
    // rank_costへ加算する延長料金は「1名分」：延長合計(price) / 延長人数(count)
    const extensionTotal = setExtensions.reduce((sum: number, e: any) => {
      const price = Number(e?.price);
      const count = Number(e?.count) || 1;
      if (!Number.isFinite(price) || count <= 0) return sum;
      return sum + price / count;
    }, 0);

    const chargeRes = await client.query(
      `SELECT charge_name, value FROM add_charges WHERE charge_name = ANY($1::text[])`,
      [['set_price', 'main', 'together']]
    );
    const chargeMap: Record<string, number> = {};
    for (const row of chargeRes.rows) {
      chargeMap[String(row.charge_name)] = Number(row.value) || 0;
    }
    const setUnit = chargeMap['set_price'] || 0;
    const mainFee = chargeMap['main'] || 0;
    const togetherFee = chargeMap['together'] || 0;
    // rank_costへ加算するセット料金は「1名分」：set_price.value（人数を掛けない）
    const setFeeTotal = setUnit;
    const mainFeeForExtensions = mainFee * extensionCount;

    // キャスト用注文（for_cast=1）の合計
    const castOrderRes = await client.query(
      `SELECT COALESCE(SUM(total_price), 0) AS total
         FROM salesorder
        WHERE session_id = $1 AND cast_id = $2 AND for_cast = 1`,
      [sessionId, castId]
    );
    const castOrderTotal = Number(castOrderRes.rows[0]?.total ?? 0) || 0;

    // rank_point 初期値
    const rankPointInit =
      typeId === 'inside'
        ? 0.5
        : 1 + extensionCount;

    // rank_cost 初期値（要件ベース。insideは延長後に本指名扱いになるため初期0）
    let rankCostInit = 0;
    if (typeId === 'main') {
      rankCostInit = setFeeTotal + mainFee + extensionTotal + mainFeeForExtensions + castOrderTotal;
    } else if (typeId === 'together') {
      rankCostInit = setFeeTotal + togetherFee + extensionTotal + mainFeeForExtensions + castOrderTotal;
    } else {
      rankCostInit = 0;
    }

    // cast側取り分（指名料増分 × 指名率%）を算出
    // 指名率は user テーブルの該当カラム（main_nomination / inside_nomination / together_nomination）を参照
    const rateRes = await client.query(
      `SELECT main_nomination, inside_nomination, together_nomination FROM "user" WHERE id = $1`,
      [castId]
    );
    const rates = rateRes.rows[0] || {};
    // inside でも tomain_nomination=1 の場合は main 扱い（ただしPOST時は常に0）
    const effectiveTypeId = typeId;
    const ratePct =
      effectiveTypeId === 'main'
        ? Number(rates.main_nomination ?? 0)
        : effectiveTypeId === 'inside'
          ? Number(rates.inside_nomination ?? 0)
          : Number(rates.together_nomination ?? 0);
    const castShare = costValue > 0 ? (costValue * (Number.isFinite(ratePct) ? ratePct : 0)) / 100 : 0;

    const result = await client.query(
      `
        INSERT INTO nomination (cast_id, table_id, session_id, type_id, cost, cost_cast, tomain_nomination, rank_cost, rank_point)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, cast_id, table_id, session_id, type_id, cost, cost_cast, tomain_nomination, rank_cost, rank_point, created_at, updated_at
      `,
      [castId, tableId, sessionId, typeId, costValue, castShare, tomainNomination, rankCostInit, rankPointInit]
    );

    const inserted = result.rows[0];

    const detailResult = await client.query(
      `
        SELECT 
          n.id,
          n.cast_id,
          u.name AS cast_name,
          n.table_id,
          n.session_id,
          n.type_id,
          n.cost,
          n.cost_cast,
          n.tomain_nomination,
          n.rank_cost,
          n.rank_point,
          n.created_at,
          n.updated_at
        FROM nomination n
        INNER JOIN "user" u ON u.id = n.cast_id
        WHERE n.id = $1
      `,
      [inserted.id]
    );

    const nomination = detailResult.rows[0];
    nomination.type_label = NOMINATION_TYPE_LABELS[nomination.type_id] || nomination.type_id;

    return NextResponse.json({ success: true, nomination });
  } catch (error) {
    console.error('指名登録エラー:', error);
    return NextResponse.json(
      { success: false, error: '指名の登録に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function DELETE(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id は必須です' },
        { status: 400 }
      );
    }

    const result = await client.query(`DELETE FROM nomination WHERE id = $1`, [id]);
    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: '該当の指名が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('指名削除エラー:', error);
    return NextResponse.json(
      { success: false, error: '指名の削除に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

