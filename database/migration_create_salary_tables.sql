-- 給与カテゴリテーブル
CREATE TABLE IF NOT EXISTS salary_category (
    id SERIAL PRIMARY KEY,
    cast_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL,
    value DECIMAL(10,2) DEFAULT 0.00 CHECK (value >= 0),
    other TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 給与出勤日数テーブル
CREATE TABLE IF NOT EXISTS salary_attenday (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL,
    attenday_number INTEGER NOT NULL CHECK (attenday_number >= 0),
    value DECIMAL(10,2) DEFAULT 0.00 CHECK (value >= 0),
    other TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_salary_category_cast_id ON salary_category(cast_id);
CREATE INDEX IF NOT EXISTS idx_salary_category_category_id ON salary_category(category_id);
CREATE INDEX IF NOT EXISTS idx_salary_attenday_category_id ON salary_attenday(category_id);
CREATE INDEX IF NOT EXISTS idx_salary_attenday_attenday_number ON salary_attenday(attenday_number);

-- トリガー
CREATE TRIGGER update_salary_category_updated_at 
    BEFORE UPDATE ON salary_category 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_salary_attenday_updated_at 
    BEFORE UPDATE ON salary_attenday 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

