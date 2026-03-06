-- serviceorderテーブルの外部キー制約を修正するマイグレーション

-- 既存の外部キー制約を削除
ALTER TABLE serviceorder DROP CONSTRAINT IF EXISTS serviceorder_service_id_fkey;

-- 正しい外部キー制約を追加
ALTER TABLE serviceorder ADD CONSTRAINT serviceorder_service_id_fkey 
FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE;
