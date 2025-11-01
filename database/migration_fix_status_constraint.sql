-- salesorderテーブルのstatus制約を修正するマイグレーション

-- 既存の制約を削除
ALTER TABLE salesorder DROP CONSTRAINT IF EXISTS salesorder_status_check;

-- 正しい制約を追加
ALTER TABLE salesorder ADD CONSTRAINT salesorder_status_check 
CHECK (status IN ('pending', 'accepted', 'rejected', 'completed'));
