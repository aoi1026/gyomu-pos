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
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
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

    const result = await client.query(
      `
        INSERT INTO nomination (cast_id, table_id, session_id, type_id, cost)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, cast_id, table_id, session_id, type_id, cost, created_at, updated_at
      `,
      [castId, tableId, sessionId, typeId, costValue]
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

