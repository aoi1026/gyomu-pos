-- シフトテーブルを作成
-- 2025-01-XX

CREATE TABLE IF NOT EXISTS shift (
    id SERIAL PRIMARY KEY,
    cast_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cast_id, date)
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_shift_cast_id ON shift(cast_id);
CREATE INDEX IF NOT EXISTS idx_shift_date ON shift(date);
CREATE INDEX IF NOT EXISTS idx_shift_cast_date ON shift(cast_id, date);

-- 更新時のトリガー
CREATE TRIGGER update_shift_updated_at 
    BEFORE UPDATE ON shift 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE shift IS 'キャストのシフト（出勤予約日）管理テーブル';
COMMENT ON COLUMN shift.cast_id IS 'キャストID（userテーブルのid）';
COMMENT ON COLUMN shift.date IS '出勤予約日';

