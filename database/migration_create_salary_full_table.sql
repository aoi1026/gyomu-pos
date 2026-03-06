-- 100%給与反映カテゴリテーブル
CREATE TABLE IF NOT EXISTS salary_full (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES category(id) ON DELETE CASCADE,
    other TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (category_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_salary_full_category_id ON salary_full(category_id);

-- トリガー
CREATE TRIGGER update_salary_full_updated_at 
    BEFORE UPDATE ON salary_full 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

