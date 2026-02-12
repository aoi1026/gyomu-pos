-- project_variableテーブルに store_address, store_tel を追加
-- 既存データベースで実行する場合はこのスクリプトを実行してください

INSERT INTO project_variable (name, value, other)
VALUES 
  ('store_address', '', '店舗住所'),
  ('store_tel', '', '店舗電話番号')
ON CONFLICT (name) DO NOTHING;
