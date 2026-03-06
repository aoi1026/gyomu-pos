-- salesorderテーブルにaccepted_atとaccepted_byカラムを追加するマイグレーション

-- accepted_atカラムを追加
ALTER TABLE salesorder ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE;

-- accepted_byカラムを追加
ALTER TABLE salesorder ADD COLUMN IF NOT EXISTS accepted_by INTEGER REFERENCES "user"(id);

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_salesorder_accepted_at ON salesorder(accepted_at);
CREATE INDEX IF NOT EXISTS idx_salesorder_accepted_by ON salesorder(accepted_by);
