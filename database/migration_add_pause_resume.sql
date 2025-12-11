-- セッションテーブルに停止/再開機能を追加
-- 2025-01-XX

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS paused_elapsed INTEGER DEFAULT 0;

COMMENT ON COLUMN sessions.is_paused IS 'セッションが停止中かどうか';
COMMENT ON COLUMN sessions.paused_at IS '最後に停止した時刻';
COMMENT ON COLUMN sessions.paused_elapsed IS '累積停止時間（秒）';



