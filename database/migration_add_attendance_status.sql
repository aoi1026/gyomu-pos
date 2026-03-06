-- userテーブルに出勤状態項目を追加
-- 2025-01-XX

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS attendance_status INTEGER DEFAULT 0;

COMMENT ON COLUMN "user".attendance_status IS '出勤状態: 0=退勤, 1=出勤中';

-- 既存のレコードの初期値を0に設定
UPDATE "user" SET attendance_status = 0 WHERE attendance_status IS NULL;

