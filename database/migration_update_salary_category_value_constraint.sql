-- salary_categoryテーブルのvalue制約を更新（-1を許可）
ALTER TABLE salary_category DROP CONSTRAINT IF EXISTS salary_category_value_check;
ALTER TABLE salary_category ADD CONSTRAINT salary_category_value_check CHECK (value >= -1);

