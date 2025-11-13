-- キャバクラシステム用データベーススキーマ
-- PostgreSQL用のテーブル定義

-- テーブル情報を管理するテーブル
CREATE TABLE IF NOT EXISTS "table" (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    other TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ユーザー情報を管理するテーブル（キャスト、管理者など）
CREATE TABLE IF NOT EXISTS "user" (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    mail VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'cast', 'manager')),
    drink_back DECIMAL(5,2) DEFAULT 0.00 CHECK (drink_back >= 0 AND drink_back <= 100),
    food_back DECIMAL(5,2) DEFAULT 0.00 CHECK (food_back >= 0 AND food_back <= 100),
    main_nomination DECIMAL(5,2) DEFAULT 0.00 CHECK (main_nomination >= 0 AND main_nomination <= 100),
    inside_nomination DECIMAL(5,2) DEFAULT 0.00 CHECK (inside_nomination >= 0 AND inside_nomination <= 100),
    together_nomination DECIMAL(5,2) DEFAULT 0.00 CHECK (together_nomination >= 0 AND together_nomination <= 100),
    hourly_price DECIMAL(10,2) DEFAULT 0.00 CHECK (hourly_price >= 0),
    other TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 追加料金設定テーブル
CREATE TABLE IF NOT EXISTS add_charges (
    id SERIAL PRIMARY KEY,
    charge_name VARCHAR(100) UNIQUE NOT NULL,
    value DECIMAL(10,2) DEFAULT 0.00 CHECK (value >= 0),
    other TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_add_charges_name ON add_charges(charge_name);

CREATE TRIGGER update_add_charges_updated_at 
    BEFORE UPDATE ON add_charges 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 初期追加料金データ
INSERT INTO add_charges (charge_name, value, other) VALUES
    ('main', 0.00, NULL),
    ('inside', 0.00, NULL),
    ('together', 0.00, NULL),
    ('bottle_keep', 0.00, NULL),
    ('vip_room', 0.00, NULL),
    ('song_room', 0.00, NULL)
ON CONFLICT (charge_name) DO NOTHING;

CREATE TABLE IF NOT EXISTS nomination (
    id SERIAL PRIMARY KEY,
    cast_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    table_id INTEGER NOT NULL REFERENCES "table"(id) ON DELETE CASCADE,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    type_id VARCHAR(50) NOT NULL CHECK (type_id IN ('main', 'inside', 'together')),
    cost DECIMAL(10,2) DEFAULT 0.00 CHECK (cost >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_nomination_cast_id ON nomination(cast_id);
CREATE INDEX IF NOT EXISTS idx_nomination_table_id ON nomination(table_id);
CREATE INDEX IF NOT EXISTS idx_nomination_session_id ON nomination(session_id);
CREATE INDEX IF NOT EXISTS idx_nomination_type_id ON nomination(type_id);

CREATE TRIGGER update_nomination_updated_at
    BEFORE UPDATE ON nomination
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ボトルキープテーブル
CREATE TABLE IF NOT EXISTS bottle_keep (
    id SERIAL PRIMARY KEY,
    client_name VARCHAR(255) NOT NULL,
    client_email VARCHAR(255),
    bottle_name VARCHAR(255) NOT NULL,
    amount INTEGER NOT NULL CHECK (amount >= 0),
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    table_id INTEGER NOT NULL REFERENCES "table"(id) ON DELETE CASCADE,
    other TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bottle_keep_session_id ON bottle_keep(session_id);
CREATE INDEX IF NOT EXISTS idx_bottle_keep_table_id ON bottle_keep(table_id);
CREATE INDEX IF NOT EXISTS idx_bottle_keep_client_email ON bottle_keep(client_email);

CREATE TRIGGER update_bottle_keep_updated_at
    BEFORE UPDATE ON bottle_keep
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_table_name ON "table"(name);
CREATE INDEX IF NOT EXISTS idx_user_mail ON "user"(mail);
CREATE INDEX IF NOT EXISTS idx_user_role ON "user"(role);

-- 更新日時を自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- テーブル更新時のトリガー
CREATE TRIGGER update_table_updated_at 
    BEFORE UPDATE ON "table" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ユーザー更新時のトリガー
CREATE TRIGGER update_user_updated_at 
    BEFORE UPDATE ON "user" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- メニューカテゴリ管理テーブル
CREATE TABLE IF NOT EXISTS category (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    other TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 商品管理テーブル
CREATE TABLE IF NOT EXISTS product (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES category(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    sku VARCHAR(50) UNIQUE NOT NULL,
    sale_price DECIMAL(10,2) NOT NULL CHECK (sale_price >= 0),
    amount INTEGER DEFAULT 0 CHECK (amount >= 0),
    other TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_category_name ON category(name);
CREATE INDEX IF NOT EXISTS idx_product_category ON product(category_id);
CREATE INDEX IF NOT EXISTS idx_product_sku ON product(sku);
CREATE INDEX IF NOT EXISTS idx_product_name ON product(name);

-- カテゴリ更新時のトリガー
CREATE TRIGGER update_category_updated_at 
    BEFORE UPDATE ON category 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 商品更新時のトリガー
CREATE TRIGGER update_product_updated_at 
    BEFORE UPDATE ON product 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 勤怠情報を管理するテーブル
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    clock_in TIMESTAMP WITH TIME ZONE NOT NULL,
    clock_out TIMESTAMP WITH TIME ZONE,
    total_work_hours DECIMAL(5,2),
    comment TEXT,
    detailed_times JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'saved')),
    approved_by INTEGER REFERENCES "user"(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 勤怠テーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_attendance_staff_id ON attendance(staff_id);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);
CREATE INDEX IF NOT EXISTS idx_attendance_clock_in ON attendance(clock_in);

-- 勤怠更新時のトリガー
CREATE TRIGGER update_attendance_updated_at 
    BEFORE UPDATE ON attendance 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- サービス呼び出し項目管理テーブル
CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    other TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- サービステーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_services_name ON services(name);

-- サービス更新時のトリガー
CREATE TRIGGER update_services_updated_at 
    BEFORE UPDATE ON services 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 給与テーブル
CREATE TABLE IF NOT EXISTS salary (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    basic_hours DECIMAL(7,2) DEFAULT 0.00 CHECK (basic_hours >= 0),
    base_pay DECIMAL(12,2) DEFAULT 0.00 CHECK (base_pay >= 0),
    main_nomination_count INTEGER DEFAULT 0 CHECK (main_nomination_count >= 0),
    main_nomination_fee DECIMAL(12,2) DEFAULT 0.00 CHECK (main_nomination_fee >= 0),
    inside_nomination_count INTEGER DEFAULT 0 CHECK (inside_nomination_count >= 0),
    inside_nomination_fee DECIMAL(12,2) DEFAULT 0.00 CHECK (inside_nomination_fee >= 0),
    drink_back_yen DECIMAL(12,2) DEFAULT 0.00 CHECK (drink_back_yen >= 0),
    food_back_yen DECIMAL(12,2) DEFAULT 0.00 CHECK (food_back_yen >= 0),
    together_nomination_cost DECIMAL(12,2) DEFAULT 0.00 CHECK (together_nomination_cost >= 0),
    together_nomination_count INTEGER DEFAULT 0 CHECK (together_nomination_count >= 0),
    together_nomination_fee DECIMAL(12,2) DEFAULT 0.00 CHECK (together_nomination_fee >= 0),
    overtime_wage_yen DECIMAL(12,2) DEFAULT 0.00 CHECK (overtime_wage_yen >= 0),
    deduction_yen DECIMAL(12,2) DEFAULT 0.00,
    total_pay_yen DECIMAL(12,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, year, month)
);

-- 給与インデックス
CREATE INDEX IF NOT EXISTS idx_salary_user_month ON salary(user_id, year, month);

-- セッション管理テーブル
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    table_id INTEGER NOT NULL REFERENCES "table"(id) ON DELETE CASCADE,
    cost DECIMAL(10,2) DEFAULT 0.00 CHECK (cost >= 0),
    end_at TIMESTAMP WITH TIME ZONE,
    client INTEGER,
    set_count INTEGER DEFAULT 1 CHECK (set_count >= 1),
    set_extensions JSONB DEFAULT '[]'::jsonb,
    status INTEGER DEFAULT 0 CHECK (status IN (0, 1)),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- セッションテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_sessions_table_id ON sessions(table_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);

-- セッション更新時のトリガー
CREATE TRIGGER update_sessions_updated_at 
    BEFORE UPDATE ON sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 売上注文管理テーブル
CREATE TABLE IF NOT EXISTS salesorder (
    id SERIAL PRIMARY KEY,
    cast_id INTEGER REFERENCES "user"(id) ON DELETE SET NULL,
    product_id INTEGER NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL CHECK (amount > 0),
    table_id INTEGER NOT NULL REFERENCES "table"(id) ON DELETE CASCADE,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
    for_cast INTEGER DEFAULT 0 CHECK (for_cast IN (0, 1)),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
    accepted_at TIMESTAMP WITH TIME ZONE,
    accepted_by INTEGER REFERENCES "user"(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 売上注文テーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_salesorder_cast_id ON salesorder(cast_id);
CREATE INDEX IF NOT EXISTS idx_salesorder_product_id ON salesorder(product_id);
CREATE INDEX IF NOT EXISTS idx_salesorder_table_id ON salesorder(table_id);
CREATE INDEX IF NOT EXISTS idx_salesorder_session_id ON salesorder(session_id);
CREATE INDEX IF NOT EXISTS idx_salesorder_status ON salesorder(status);
CREATE INDEX IF NOT EXISTS idx_salesorder_created_at ON salesorder(created_at);

-- 売上注文更新時のトリガー
CREATE TRIGGER update_salesorder_updated_at 
    BEFORE UPDATE ON salesorder 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- サービス注文管理テーブル
CREATE TABLE IF NOT EXISTS serviceorder (
    id SERIAL PRIMARY KEY,
    cast_id INTEGER REFERENCES "user"(id) ON DELETE SET NULL,
    service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL CHECK (amount > 0),
    table_id INTEGER NOT NULL REFERENCES "table"(id) ON DELETE CASCADE,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
    accepted_at TIMESTAMP WITH TIME ZONE,
    accepted_by INTEGER REFERENCES "user"(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- サービス注文テーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_serviceorder_cast_id ON serviceorder(cast_id);
CREATE INDEX IF NOT EXISTS idx_serviceorder_service_id ON serviceorder(service_id);
CREATE INDEX IF NOT EXISTS idx_serviceorder_table_id ON serviceorder(table_id);
CREATE INDEX IF NOT EXISTS idx_serviceorder_session_id ON serviceorder(session_id);
CREATE INDEX IF NOT EXISTS idx_serviceorder_status ON serviceorder(status);
CREATE INDEX IF NOT EXISTS idx_serviceorder_created_at ON serviceorder(created_at);

-- サービス注文更新時のトリガー
CREATE TRIGGER update_serviceorder_updated_at 
    BEFORE UPDATE ON serviceorder 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- スタッフ呼び出し管理テーブル
CREATE TABLE IF NOT EXISTS callmanager (
    id SERIAL PRIMARY KEY,
    cast_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    table_id INTEGER NOT NULL REFERENCES "table"(id) ON DELETE CASCADE,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    calltype VARCHAR(50) NOT NULL DEFAULT 'manager',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    accepted_at TIMESTAMP WITH TIME ZONE,
    accepted_by INTEGER REFERENCES "user"(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- スタッフ呼び出しテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_callmanager_cast_id ON callmanager(cast_id);
CREATE INDEX IF NOT EXISTS idx_callmanager_table_id ON callmanager(table_id);
CREATE INDEX IF NOT EXISTS idx_callmanager_session_id ON callmanager(session_id);
CREATE INDEX IF NOT EXISTS idx_callmanager_calltype ON callmanager(calltype);
CREATE INDEX IF NOT EXISTS idx_callmanager_status ON callmanager(status);
CREATE INDEX IF NOT EXISTS idx_callmanager_created_at ON callmanager(created_at);

-- スタッフ呼び出し更新時のトリガー
CREATE TRIGGER update_callmanager_updated_at 
    BEFORE UPDATE ON callmanager 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 通知管理テーブル
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    table_id INTEGER NOT NULL,
    table_label VARCHAR(100),
    cast_name VARCHAR(100),
    message TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 通知テーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_table_id ON notifications(table_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- 通知更新時のトリガー
CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON notifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

