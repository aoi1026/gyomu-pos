-- 初期データの挿入
-- システム管理者の初期設定

-- 管理者ユーザーの挿入
-- パスワードはMD5でハッシュ化済み
INSERT INTO "user" (
    name, 
    mail, 
    password, 
    role, 
    bottle_back, 
    drink_back, 
    main_nomination, 
    inside_nomination,
    other
) VALUES (
    'システム管理者',
    'admin@example.com',
    'eb5eb52d7efb07d90d05fcf5c7516fe5', -- AdminPassword@123 のMD5ハッシュ
    'admin',
    0.00,
    0.00,
    0.00,
    0.00,
    ''
) ON CONFLICT (mail) DO NOTHING;

-- サンプルテーブルデータの挿入（必要に応じて）
INSERT INTO "table" (name, capacity, other) VALUES
    ('テーブル1', 2, 'VIP席'),
    ('テーブル2', 2, '一般席'),
    ('テーブル3', 2, 'カップル席'),
    ('テーブル4', 2, 'グループ席'),
    ('テーブル5', 2, '一般席')
ON CONFLICT DO NOTHING;

