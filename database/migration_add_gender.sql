-- userテーブルに性別項目を追加
-- 2025-01-XX

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS gender VARCHAR(10);

COMMENT ON COLUMN "user".gender IS '性別: male, female, other, またはNULL';

-- 既存のレコードの初期値はNULLのまま
