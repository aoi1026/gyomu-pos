-- VIPルーム・カラオケ（ソング）ルーム管理

CREATE TABLE IF NOT EXISTS vip_room (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    status SMALLINT NOT NULL DEFAULT 0 CHECK (status IN (0, 1)),
    other TEXT,
    session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vip_room_session_id ON vip_room(session_id);
CREATE INDEX IF NOT EXISTS idx_vip_room_status ON vip_room(status);

CREATE TABLE IF NOT EXISTS song_room (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    status SMALLINT NOT NULL DEFAULT 0 CHECK (status IN (0, 1)),
    other TEXT,
    session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_song_room_session_id ON song_room(session_id);
CREATE INDEX IF NOT EXISTS idx_song_room_status ON song_room(status);
