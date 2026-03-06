-- sessionsテーブルにmemoカラムを追加するマイグレーション

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS memo TEXT;

COMMENT ON COLUMN sessions.memo IS 'セッションのメモ';
