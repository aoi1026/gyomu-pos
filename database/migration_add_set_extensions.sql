-- セッションテーブルにset_extensionsカラムを追加
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS set_extensions JSONB DEFAULT '[]'::jsonb;

