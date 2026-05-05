import type { PoolClient } from 'pg';

/** DBに vip_room / song_room テーブルを用意（既存環境向けの保険） */
export async function ensureRoomTables(client: PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS vip_room (
      id SERIAL PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      status SMALLINT NOT NULL DEFAULT 0 CHECK (status IN (0, 1)),
      other TEXT,
      session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_vip_room_session_id ON vip_room(session_id)
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_vip_room_status ON vip_room(status)
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS song_room (
      id SERIAL PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      status SMALLINT NOT NULL DEFAULT 0 CHECK (status IN (0, 1)),
      other TEXT,
      session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_song_room_session_id ON song_room(session_id)
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_song_room_status ON song_room(status)
  `);
}

export async function releaseRoomsForSession(client: PoolClient, sessionId: number) {
  await ensureRoomTables(client);
  await client.query(
    `UPDATE vip_room SET status = 0, session_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE session_id = $1`,
    [sessionId]
  );
  await client.query(
    `UPDATE song_room SET status = 0, session_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE session_id = $1`,
    [sessionId]
  );
}
