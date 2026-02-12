-- 初期データの挿入
-- システム管理者の初期設定

-- 管理者ユーザーの挿入
-- パスワードはMD5でハッシュ化済み
INSERT INTO "user" (
    name, 
    mail, 
    password, 
    role, 
    drink_back, 
    food_back, 
    main_nomination, 
    inside_nomination,
    other
) VALUES (
    'システム管理者',
    'admin@example.com',
    'b161b045b298f9abb4e4767d839c4bbe', -- AdminPassword@!@# のMD5ハッシュ
    'super_admin',
    0.00,
    0.00,
    0.00,
    0.00,
    ''
) ON CONFLICT (mail) DO UPDATE SET
  name = EXCLUDED.name,
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  updated_at = CURRENT_TIMESTAMP;

-- サンプルテーブルデータの挿入（必要に応じて）
INSERT INTO "table" (name, capacity, other) VALUES
    ('テーブル1', 2, 'VIP席'),
    ('テーブル2', 2, '一般席'),
    ('テーブル3', 2, 'カップル席'),
    ('テーブル4', 2, 'グループ席'),
    ('テーブル5', 2, '一般席')
ON CONFLICT DO NOTHING;

-- プロジェクト変数の初期データ
INSERT INTO project_variable (name, value, other) VALUES
    ('store_name', '銀座エレガンス', '店舗名'),
    ('store_address', '', '店舗住所'),
    ('store_tel', '', '店舗電話番号')
ON CONFLICT (name) DO NOTHING;

