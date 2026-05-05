import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

// 追加サービステーブルの存在確認と作成
async function ensureAdditionalServicesTable(client: any) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS additional_services (
      id SERIAL PRIMARY KEY,
      session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      service_type VARCHAR(50) NOT NULL CHECK (service_type IN ('bottle_keep', 'vip_room', 'karaoke')),
      count INTEGER NOT NULL DEFAULT 1 CHECK (count > 0),
      charge DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (charge >= 0),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.query(`
    ALTER TABLE additional_services ADD COLUMN IF NOT EXISTS note TEXT
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_additional_services_session_id 
    ON additional_services(session_id)
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_additional_services_service_type 
    ON additional_services(service_type)
  `);

  // トリガー関数が存在しない場合は作成
  await client.query(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql'
  `);

  // トリガーを作成（存在しない場合のみ）
  await client.query(`
    DROP TRIGGER IF EXISTS update_additional_services_updated_at ON additional_services
  `);

  await client.query(`
    CREATE TRIGGER update_additional_services_updated_at
    BEFORE UPDATE ON additional_services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
  `);
}

// GET: セッションIDに基づいて追加サービスを取得
export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    await ensureAdditionalServicesTable(client);

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'session_id is required' },
        { status: 400 }
      );
    }

    const result = await client.query(
      `SELECT id, session_id, service_type, count, charge, note, created_at, updated_at
       FROM additional_services
       WHERE session_id = $1
       ORDER BY created_at ASC`,
      [parseInt(sessionId, 10)]
    );

    // フロントエンドで使用する形式に変換
    const services = result.rows.map(row => ({
      id: row.id,
      type: row.service_type,
      count: row.count,
      charge: parseFloat(row.charge),
      note: row.note ?? undefined,
      timestamp: new Date(row.created_at).getTime()
    }));

    return NextResponse.json({
      success: true,
      data: services
    });
  } catch (error) {
    console.error('追加サービス取得エラー:', error);
    return NextResponse.json(
      { success: false, error: '追加サービスの取得に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// POST: 追加サービスを登録
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    await ensureAdditionalServicesTable(client);

    const body = await request.json();
    const { sessionId, type, count, charge, note } = body;

    if (!sessionId || !type || !count || charge === undefined) {
      return NextResponse.json(
        { success: false, error: 'sessionId, type, count, and charge are required' },
        { status: 400 }
      );
    }

    if (!['bottle_keep', 'vip_room', 'karaoke'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid service type' },
        { status: 400 }
      );
    }

    const noteVal = note !== undefined && note !== null && String(note).trim() !== '' ? String(note) : null;

    const result = await client.query(
      `INSERT INTO additional_services (session_id, service_type, count, charge, note)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, session_id, service_type, count, charge, note, created_at, updated_at`,
      [parseInt(sessionId, 10), type, parseInt(count, 10), parseFloat(charge), noteVal]
    );

    const row = result.rows[0];
    const service = {
      id: row.id,
      type: row.service_type,
      count: row.count,
      charge: parseFloat(row.charge),
      note: row.note ?? undefined,
      timestamp: new Date(row.created_at).getTime()
    };

    return NextResponse.json({
      success: true,
      data: service
    });
  } catch (error) {
    console.error('追加サービス登録エラー:', error);
    return NextResponse.json(
      { success: false, error: '追加サービスの登録に失敗しました' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

