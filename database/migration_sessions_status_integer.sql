-- セッションテーブルのstatus項目を整数型に変更（0: 終了, 1: 進行中）
-- 2025-01-12

-- 既存のstatus値をマッピング: active -> 1, ended/cancelled -> 0
ALTER TABLE sessions ADD COLUMN status_int INTEGER DEFAULT 0;

UPDATE sessions 
SET status_int = CASE 
  WHEN status = 'active' THEN 1 
  ELSE 0 
END;

ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_status_check;
ALTER TABLE sessions DROP COLUMN status;
ALTER TABLE sessions RENAME COLUMN status_int TO status;

-- ステータスは0または1のみ
ALTER TABLE sessions ADD CONSTRAINT sessions_status_check CHECK (status IN (0, 1));

-- インデックス再作成
DROP INDEX IF EXISTS idx_sessions_status;
CREATE INDEX idx_sessions_status ON sessions(status);

COMMENT ON COLUMN sessions.status IS 'セッション状態: 0=終了, 1=進行中';

