--
-- PostgreSQL 17.7 完全マイグレーション
-- キャバクラシステム用データベース統合スキーマ
-- 生成日: 2025-12-17
--

-- データベース設定
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';
SET default_table_access_method = heap;

-- ========================================
-- トリガー関数
-- ========================================

-- 更新日時を自動更新するトリガー関数
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- テーブル定義
-- ========================================

-- テーブル情報を管理するテーブル
CREATE TABLE IF NOT EXISTS public."table" (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    other TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ユーザー情報を管理するテーブル（キャスト、管理者など）
CREATE TABLE IF NOT EXISTS public."user" (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    mail VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'cast', 'manager', 'super_admin')),
    food_back DECIMAL(5,2) DEFAULT 0.00,
    drink_back DECIMAL(5,2) DEFAULT 0.00,
    main_nomination DECIMAL(5,2) DEFAULT 0.00,
    inside_nomination DECIMAL(5,2) DEFAULT 0.00,
    together_nomination DECIMAL(5,2) DEFAULT 0.00,
    hourly_price DECIMAL(10,2) DEFAULT 0.00 CHECK (hourly_price >= 0),
    other TEXT,
    attendance_status INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_drink_back_check CHECK ((drink_back >= 0) AND (drink_back <= 100)),
    CONSTRAINT user_food_back_check CHECK ((food_back >= 0) AND (food_back <= 100)),
    CONSTRAINT user_main_nomination_check CHECK ((main_nomination >= 0) AND (main_nomination <= 100)),
    CONSTRAINT user_inside_nomination_check CHECK ((inside_nomination >= 0) AND (inside_nomination <= 100)),
    CONSTRAINT user_together_nomination_check CHECK ((together_nomination >= 0) AND (together_nomination <= 100))
);

-- 既存テーブルへのカラム追加（存在しない場合のみ）
DO $$ 
BEGIN
    -- attendance_statusカラムを追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user' 
        AND column_name = 'attendance_status'
    ) THEN
        ALTER TABLE public."user" ADD COLUMN attendance_status INTEGER DEFAULT 0;
    END IF;
    
    -- together_nominationカラムを追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user' 
        AND column_name = 'together_nomination'
    ) THEN
        ALTER TABLE public."user" ADD COLUMN together_nomination DECIMAL(5,2) DEFAULT 0.00;
        ALTER TABLE public."user" ADD CONSTRAINT user_together_nomination_check CHECK ((together_nomination >= 0) AND (together_nomination <= 100));
    END IF;
END $$;

-- コメント追加（エラーを無視）
DO $$ 
BEGIN
    EXECUTE 'COMMENT ON COLUMN public."user".attendance_status IS ''出勤状態: 0=退勤, 1=出勤中''';
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- メニューカテゴリ管理テーブル
CREATE TABLE IF NOT EXISTS public.category (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    other TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 商品管理テーブル
CREATE TABLE IF NOT EXISTS public.product (
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

-- セッション管理テーブル
CREATE TABLE IF NOT EXISTS public.sessions (
    id SERIAL PRIMARY KEY,
    table_id INTEGER NOT NULL REFERENCES "table"(id) ON DELETE CASCADE,
    cost DECIMAL(10,2) DEFAULT 0.00 CHECK (cost >= 0),
    end_at TIMESTAMP WITH TIME ZONE,
    client INTEGER,
    set_count INTEGER DEFAULT 1 CHECK (set_count >= 1),
    set_extensions JSONB DEFAULT '[]'::jsonb,
    status INTEGER DEFAULT 0 CHECK (status IN (0, 1)),
    is_paused BOOLEAN DEFAULT false,
    paused_at TIMESTAMP WITH TIME ZONE,
    paused_elapsed INTEGER DEFAULT 0,
    -- 決済方法: 0=店舗用クレジットカード, 1=現金, 2=クレジットカード
    pay_type INTEGER CHECK (pay_type IN (0, 1, 2)),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- セッション決済履歴テーブル
CREATE TABLE IF NOT EXISTS public.session_payments (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    -- 決済方法: 0=店舗用クレジットカード, 1=現金, 2=クレジットカード
    pay_type INTEGER NOT NULL CHECK (pay_type IN (0, 1, 2)),
    amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
    other TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_session_payments_session_id ON public.session_payments(session_id);
CREATE INDEX IF NOT EXISTS idx_session_payments_created_at ON public.session_payments(created_at);

CREATE TRIGGER update_session_payments_updated_at
    BEFORE UPDATE ON public.session_payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 既存sessionsテーブルへのカラム追加（存在しない場合のみ）
DO $$ 
BEGIN
    -- is_pausedカラムを追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sessions' 
        AND column_name = 'is_paused'
    ) THEN
        ALTER TABLE public.sessions ADD COLUMN is_paused BOOLEAN DEFAULT false;
    END IF;
    
    -- paused_atカラムを追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sessions' 
        AND column_name = 'paused_at'
    ) THEN
        ALTER TABLE public.sessions ADD COLUMN paused_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- paused_elapsedカラムを追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sessions' 
        AND column_name = 'paused_elapsed'
    ) THEN
        ALTER TABLE public.sessions ADD COLUMN paused_elapsed INTEGER DEFAULT 0;
    END IF;

    -- pay_typeカラムを追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sessions' 
        AND column_name = 'pay_type'
    ) THEN
        ALTER TABLE public.sessions ADD COLUMN pay_type INTEGER;
    END IF;
END $$;

-- pay_type CHECK制約追加（エラーを無視）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM pg_constraint c
          JOIN pg_class t ON t.oid = c.conrelid
          JOIN pg_namespace n ON n.oid = t.relnamespace
         WHERE n.nspname = 'public'
           AND t.relname = 'sessions'
           AND c.conname = 'sessions_pay_type_check'
    ) THEN
        ALTER TABLE public.sessions
          ADD CONSTRAINT sessions_pay_type_check CHECK (pay_type IN (0, 1, 2));
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- コメント追加（エラーを無視）
DO $$ 
BEGIN
    EXECUTE 'COMMENT ON COLUMN public.sessions.is_paused IS ''セッションが停止中かどうか''';
    EXECUTE 'COMMENT ON COLUMN public.sessions.paused_at IS ''最後に停止した時刻''';
    EXECUTE 'COMMENT ON COLUMN public.sessions.paused_elapsed IS ''累積停止時間（秒）''';
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 追加料金設定テーブル
CREATE TABLE IF NOT EXISTS public.add_charges (
    id SERIAL PRIMARY KEY,
    charge_name VARCHAR(100) UNIQUE NOT NULL,
    value DECIMAL(10,2) DEFAULT 0.00 CHECK (value >= 0),
    other TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 指名管理テーブル
CREATE TABLE IF NOT EXISTS public.nomination (
    id SERIAL PRIMARY KEY,
    cast_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    table_id INTEGER NOT NULL REFERENCES "table"(id) ON DELETE CASCADE,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    type_id VARCHAR(50) NOT NULL CHECK (type_id IN ('main', 'inside', 'together')),
    cost DECIMAL(10,2) DEFAULT 0.00 CHECK (cost >= 0),
    -- キャスト側の取り分（指名料増分 × 指名率% を累計で保持）
    cost_cast DECIMAL(10,2) DEFAULT 0.00 CHECK (cost_cast >= 0),
    -- 場内指名(inside)がセット延長で「本指名扱い」になったかどうか（type_idはinsideのまま維持）
    tomain_nomination INTEGER DEFAULT 0 CHECK (tomain_nomination IN (0, 1)),
    -- ランク計算用: 対象キャストがテーブルで獲得した金額（要件の定義に基づき加算していく）
    rank_cost DECIMAL(12,2) DEFAULT 0.00 CHECK (rank_cost >= 0),
    -- ランク計算用: 対象キャストがテーブルで獲得したポイント
    rank_point DECIMAL(6,2) DEFAULT 0.00 CHECK (rank_point >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 既存nominationテーブルへのカラム追加（存在しない場合のみ）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'nomination'
          AND column_name = 'cost_cast'
    ) THEN
        ALTER TABLE public.nomination
          ADD COLUMN cost_cast DECIMAL(10,2) DEFAULT 0.00;
        ALTER TABLE public.nomination
          ADD CONSTRAINT nomination_cost_cast_check CHECK (cost_cast >= 0);
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 既存nominationテーブルへのカラム追加（tomain_nomination）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'nomination'
          AND column_name = 'tomain_nomination'
    ) THEN
        ALTER TABLE public.nomination
          ADD COLUMN tomain_nomination INTEGER DEFAULT 0;
        ALTER TABLE public.nomination
          ADD CONSTRAINT nomination_tomain_nomination_check CHECK (tomain_nomination IN (0, 1));
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 既存nominationテーブルへのカラム追加（rank_cost, rank_point）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'nomination'
          AND column_name = 'rank_cost'
    ) THEN
        ALTER TABLE public.nomination
          ADD COLUMN rank_cost DECIMAL(12,2) DEFAULT 0.00;
        ALTER TABLE public.nomination
          ADD CONSTRAINT nomination_rank_cost_check CHECK (rank_cost >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'nomination'
          AND column_name = 'rank_point'
    ) THEN
        ALTER TABLE public.nomination
          ADD COLUMN rank_point DECIMAL(6,2) DEFAULT 0.00;
        ALTER TABLE public.nomination
          ADD CONSTRAINT nomination_rank_point_check CHECK (rank_point >= 0);
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- ボトルキープテーブル
CREATE TABLE IF NOT EXISTS public.bottle_keep (
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

-- 追加サービステーブル
CREATE TABLE IF NOT EXISTS public.additional_services (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    service_type VARCHAR(50) NOT NULL CHECK (service_type IN ('bottle_keep', 'vip_room', 'karaoke')),
    count INTEGER DEFAULT 1 NOT NULL CHECK (count > 0),
    charge DECIMAL(10,2) DEFAULT 0.00 NOT NULL CHECK (charge >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 勤怠情報を管理するテーブル
CREATE TABLE IF NOT EXISTS public.attendance (
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

-- サービス呼び出し項目管理テーブル
CREATE TABLE IF NOT EXISTS public.services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    other TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 給与テーブル
CREATE TABLE IF NOT EXISTS public.salary (
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
    sales_back_yen DECIMAL(12,2) DEFAULT 0.00 CHECK (sales_back_yen >= 0),
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

-- 経費テーブル
CREATE TABLE IF NOT EXISTS public.deduct (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    value DECIMAL(12,2) NOT NULL CHECK (value >= 0),
    reason TEXT,
    other TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_deduct_date ON public.deduct(date);

CREATE TRIGGER update_deduct_updated_at
    BEFORE UPDATE ON public.deduct
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 既存salaryテーブルの列メンテナンス
-- - food_back_yen を削除
-- - drink_back_yen を sales_back_yen にリネーム
-- - sales_back_yen が無ければ追加
DO $$
BEGIN
    -- drink_back_yen -> sales_back_yen
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'salary' AND column_name = 'drink_back_yen'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'salary' AND column_name = 'sales_back_yen'
    ) THEN
        ALTER TABLE public.salary RENAME COLUMN drink_back_yen TO sales_back_yen;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'salary' AND column_name = 'sales_back_yen'
    ) THEN
        ALTER TABLE public.salary
          ADD COLUMN sales_back_yen DECIMAL(12,2) DEFAULT 0.00;
    END IF;

    -- food_back_yen drop
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'salary' AND column_name = 'food_back_yen'
    ) THEN
        ALTER TABLE public.salary DROP COLUMN food_back_yen;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 既存salaryテーブルへのUNIQUE制約追加（user_id, year, month）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM pg_constraint c
          JOIN pg_class t ON t.oid = c.conrelid
          JOIN pg_namespace n ON n.oid = t.relnamespace
         WHERE n.nspname = 'public'
           AND t.relname = 'salary'
           AND c.contype = 'u'
           AND pg_get_constraintdef(c.oid) LIKE '%(user_id, year, month)%'
    ) THEN
        ALTER TABLE public.salary
          ADD CONSTRAINT salary_user_year_month_unique UNIQUE (user_id, year, month);
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- コメント追加（エラーを無視）
DO $$ 
BEGIN
    EXECUTE 'COMMENT ON COLUMN public.salary.together_nomination_cost IS ''同伴者の金額（編集可能）''';
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 給与出勤日数テーブル
CREATE TABLE IF NOT EXISTS public.salary_attenday (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL,
    attenday_number INTEGER NOT NULL CHECK (attenday_number >= 0),
    value DECIMAL(10,2) DEFAULT 0.00 CHECK (value >= 0),
    other TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 給与カテゴリテーブル
CREATE TABLE IF NOT EXISTS public.salary_category (
    id SERIAL PRIMARY KEY,
    cast_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL,
    value DECIMAL(10,2) DEFAULT 0.00 CHECK (value >= -1),
    other TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 給与フルテーブル
CREATE TABLE IF NOT EXISTS public.salary_full (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL UNIQUE,
    other TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 売上注文管理テーブル
CREATE TABLE IF NOT EXISTS public.salesorder (
    id SERIAL PRIMARY KEY,
    cast_id INTEGER REFERENCES "user"(id) ON DELETE SET NULL,
    product_id INTEGER NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL CHECK (amount > 0),
    table_id INTEGER NOT NULL REFERENCES "table"(id) ON DELETE CASCADE,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
    -- キャスト給与計算用（承認済み & for_cast=1 の場合に計算して保存）
    castsalary_price DECIMAL(12,2) DEFAULT 0.00 CHECK (castsalary_price >= 0),
    for_cast INTEGER DEFAULT 0 CHECK (for_cast IN (0, 1)),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
    accepted_at TIMESTAMP WITH TIME ZONE,
    accepted_by INTEGER REFERENCES "user"(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 既存salesorderテーブルへのカラム追加（castsalary_price）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'salesorder'
          AND column_name = 'castsalary_price'
    ) THEN
        ALTER TABLE public.salesorder
          ADD COLUMN castsalary_price DECIMAL(12,2) DEFAULT 0.00;
        ALTER TABLE public.salesorder
          ADD CONSTRAINT salesorder_castsalary_price_check CHECK (castsalary_price >= 0);
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- サービス注文管理テーブル
CREATE TABLE IF NOT EXISTS public.serviceorder (
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

-- スタッフ呼び出し管理テーブル
CREATE TABLE IF NOT EXISTS public.callmanager (
    id SERIAL PRIMARY KEY,
    cast_id INTEGER REFERENCES "user"(id) ON DELETE CASCADE,
    table_id INTEGER NOT NULL REFERENCES "table"(id) ON DELETE CASCADE,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    calltype VARCHAR(50) NOT NULL DEFAULT 'manager',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    accepted_at TIMESTAMP WITH TIME ZONE,
    accepted_by INTEGER REFERENCES "user"(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 通知管理テーブル
CREATE TABLE IF NOT EXISTS public.notifications (
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

-- プロジェクト変数管理テーブル
CREATE TABLE IF NOT EXISTS public.project_variable (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    other TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- シフト管理テーブル
CREATE TABLE IF NOT EXISTS public.shift (
    id SERIAL PRIMARY KEY,
    cast_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cast_id, date)
);

-- コメント追加（エラーを無視）
DO $$ 
BEGIN
    EXECUTE 'COMMENT ON TABLE public.shift IS ''キャストのシフト（出勤予約日）管理テーブル''';
    EXECUTE 'COMMENT ON COLUMN public.shift.cast_id IS ''キャストID（userテーブルのid）''';
    EXECUTE 'COMMENT ON COLUMN public.shift.date IS ''出勤予約日''';
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- ========================================
-- 外部キー制約の追加（既存テーブル用）
-- ========================================

-- bottle_keepテーブルにsession_id外部キーを追加
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'bottle_keep' 
        AND constraint_name = 'bottle_keep_session_id_fkey'
    ) THEN
        ALTER TABLE public.bottle_keep 
        ADD CONSTRAINT bottle_keep_session_id_fkey 
        FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- nominationテーブルにsession_id外部キーを追加（存在しない場合）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'nomination' 
        AND constraint_name = 'nomination_session_id_fkey'
    ) THEN
        ALTER TABLE public.nomination 
        ADD CONSTRAINT nomination_session_id_fkey 
        FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- salesorderテーブルにsession_id外部キーを追加（存在しない場合）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'salesorder' 
        AND constraint_name = 'salesorder_session_id_fkey'
    ) THEN
        ALTER TABLE public.salesorder 
        ADD CONSTRAINT salesorder_session_id_fkey 
        FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- serviceorderテーブルにsession_id外部キーを追加（存在しない場合）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'serviceorder' 
        AND constraint_name = 'serviceorder_session_id_fkey'
    ) THEN
        ALTER TABLE public.serviceorder 
        ADD CONSTRAINT serviceorder_session_id_fkey 
        FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- callmanagerテーブルにsession_id外部キーを追加（存在しない場合）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'callmanager' 
        AND constraint_name = 'callmanager_session_id_fkey'
    ) THEN
        ALTER TABLE public.callmanager 
        ADD CONSTRAINT callmanager_session_id_fkey 
        FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- salary_fullテーブルにcategory_id外部キーを追加（存在しない場合）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'salary_full' 
        AND constraint_name = 'salary_full_category_id_fkey'
    ) THEN
        ALTER TABLE public.salary_full 
        ADD CONSTRAINT salary_full_category_id_fkey 
        FOREIGN KEY (category_id) REFERENCES public.category(id) ON DELETE CASCADE;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- ========================================
-- インデックス
-- ========================================

-- tableテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_table_name ON public."table"(name);

-- userテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_user_mail ON public."user"(mail);
CREATE INDEX IF NOT EXISTS idx_user_role ON public."user"(role);

-- categoryテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_category_name ON public.category(name);

-- productテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_product_category ON public.product(category_id);
CREATE INDEX IF NOT EXISTS idx_product_sku ON public.product(sku);
CREATE INDEX IF NOT EXISTS idx_product_name ON public.product(name);

-- sessionsテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_sessions_table_id ON public.sessions(table_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON public.sessions(created_at);

-- add_chargesテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_add_charges_name ON public.add_charges(charge_name);

-- nominationテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_nomination_cast_id ON public.nomination(cast_id);
CREATE INDEX IF NOT EXISTS idx_nomination_table_id ON public.nomination(table_id);
CREATE INDEX IF NOT EXISTS idx_nomination_session_id ON public.nomination(session_id);
CREATE INDEX IF NOT EXISTS idx_nomination_type_id ON public.nomination(type_id);

-- bottle_keepテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_bottle_keep_session_id ON public.bottle_keep(session_id);
CREATE INDEX IF NOT EXISTS idx_bottle_keep_table_id ON public.bottle_keep(table_id);
CREATE INDEX IF NOT EXISTS idx_bottle_keep_client_email ON public.bottle_keep(client_email);

-- additional_servicesテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_additional_services_session_id ON public.additional_services(session_id);
CREATE INDEX IF NOT EXISTS idx_additional_services_service_type ON public.additional_services(service_type);

-- attendanceテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_attendance_staff_id ON public.attendance(staff_id);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.attendance(status);
CREATE INDEX IF NOT EXISTS idx_attendance_clock_in ON public.attendance(clock_in);

-- servicesテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_services_name ON public.services(name);

-- salaryテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_salary_user_month ON public.salary(user_id, year, month);

-- salary_attendayテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_salary_attenday_category_id ON public.salary_attenday(category_id);
CREATE INDEX IF NOT EXISTS idx_salary_attenday_attenday_number ON public.salary_attenday(attenday_number);

-- salary_categoryテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_salary_category_cast_id ON public.salary_category(cast_id);
CREATE INDEX IF NOT EXISTS idx_salary_category_category_id ON public.salary_category(category_id);

-- salary_fullテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_salary_full_category_id ON public.salary_full(category_id);

-- salesorderテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_salesorder_cast_id ON public.salesorder(cast_id);
CREATE INDEX IF NOT EXISTS idx_salesorder_product_id ON public.salesorder(product_id);
CREATE INDEX IF NOT EXISTS idx_salesorder_table_id ON public.salesorder(table_id);
CREATE INDEX IF NOT EXISTS idx_salesorder_session_id ON public.salesorder(session_id);
CREATE INDEX IF NOT EXISTS idx_salesorder_status ON public.salesorder(status);
CREATE INDEX IF NOT EXISTS idx_salesorder_created_at ON public.salesorder(created_at);

-- serviceorderテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_serviceorder_cast_id ON public.serviceorder(cast_id);
CREATE INDEX IF NOT EXISTS idx_serviceorder_service_id ON public.serviceorder(service_id);
CREATE INDEX IF NOT EXISTS idx_serviceorder_table_id ON public.serviceorder(table_id);
CREATE INDEX IF NOT EXISTS idx_serviceorder_session_id ON public.serviceorder(session_id);
CREATE INDEX IF NOT EXISTS idx_serviceorder_status ON public.serviceorder(status);
CREATE INDEX IF NOT EXISTS idx_serviceorder_created_at ON public.serviceorder(created_at);

-- callmanagerテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_callmanager_cast_id ON public.callmanager(cast_id);
CREATE INDEX IF NOT EXISTS idx_callmanager_table_id ON public.callmanager(table_id);
CREATE INDEX IF NOT EXISTS idx_callmanager_session_id ON public.callmanager(session_id);
CREATE INDEX IF NOT EXISTS idx_callmanager_calltype ON public.callmanager(calltype);
CREATE INDEX IF NOT EXISTS idx_callmanager_status ON public.callmanager(status);
CREATE INDEX IF NOT EXISTS idx_callmanager_created_at ON public.callmanager(created_at);

-- notificationsテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_table_id ON public.notifications(table_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON public.notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

-- project_variableテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_project_variable_name ON public.project_variable(name);

-- shiftテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_shift_cast_id ON public.shift(cast_id);
CREATE INDEX IF NOT EXISTS idx_shift_date ON public.shift(date);
CREATE INDEX IF NOT EXISTS idx_shift_cast_date ON public.shift(cast_id, date);

-- ========================================
-- トリガー
-- ========================================

-- tableテーブルの更新トリガー
DROP TRIGGER IF EXISTS update_table_updated_at ON public."table";
CREATE TRIGGER update_table_updated_at 
    BEFORE UPDATE ON public."table" 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- userテーブルの更新トリガー
DROP TRIGGER IF EXISTS update_user_updated_at ON public."user";
CREATE TRIGGER update_user_updated_at 
    BEFORE UPDATE ON public."user" 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- categoryテーブルの更新トリガー
DROP TRIGGER IF EXISTS update_category_updated_at ON public.category;
CREATE TRIGGER update_category_updated_at 
    BEFORE UPDATE ON public.category 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- productテーブルの更新トリガー
DROP TRIGGER IF EXISTS update_product_updated_at ON public.product;
CREATE TRIGGER update_product_updated_at 
    BEFORE UPDATE ON public.product 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- sessionsテーブルの更新トリガー
DROP TRIGGER IF EXISTS update_sessions_updated_at ON public.sessions;
CREATE TRIGGER update_sessions_updated_at 
    BEFORE UPDATE ON public.sessions 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- add_chargesテーブルの更新トリガー
DROP TRIGGER IF EXISTS update_add_charges_updated_at ON public.add_charges;
CREATE TRIGGER update_add_charges_updated_at 
    BEFORE UPDATE ON public.add_charges 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- nominationテーブルの更新トリガー
DROP TRIGGER IF EXISTS update_nomination_updated_at ON public.nomination;
CREATE TRIGGER update_nomination_updated_at 
    BEFORE UPDATE ON public.nomination 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- bottle_keepテーブルの更新トリガー
DROP TRIGGER IF EXISTS update_bottle_keep_updated_at ON public.bottle_keep;
CREATE TRIGGER update_bottle_keep_updated_at 
    BEFORE UPDATE ON public.bottle_keep 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- additional_servicesテーブルの更新トリガー
DROP TRIGGER IF EXISTS update_additional_services_updated_at ON public.additional_services;
CREATE TRIGGER update_additional_services_updated_at 
    BEFORE UPDATE ON public.additional_services 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- attendanceテーブルの更新トリガー
DROP TRIGGER IF EXISTS update_attendance_updated_at ON public.attendance;
CREATE TRIGGER update_attendance_updated_at 
    BEFORE UPDATE ON public.attendance 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- servicesテーブルの更新トリガー
DROP TRIGGER IF EXISTS update_services_updated_at ON public.services;
CREATE TRIGGER update_services_updated_at 
    BEFORE UPDATE ON public.services 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- salaryテーブルの更新トリガー
DROP TRIGGER IF EXISTS update_salary_updated_at ON public.salary;
CREATE TRIGGER update_salary_updated_at 
    BEFORE UPDATE ON public.salary 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- salary_attendayテーブルの更新トリガー
DROP TRIGGER IF EXISTS update_salary_attenday_updated_at ON public.salary_attenday;
CREATE TRIGGER update_salary_attenday_updated_at 
    BEFORE UPDATE ON public.salary_attenday 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- salary_categoryテーブルの更新トリガー
DROP TRIGGER IF EXISTS update_salary_category_updated_at ON public.salary_category;
CREATE TRIGGER update_salary_category_updated_at 
    BEFORE UPDATE ON public.salary_category 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- salary_fullテーブルの更新トリガー
DROP TRIGGER IF EXISTS update_salary_full_updated_at ON public.salary_full;
CREATE TRIGGER update_salary_full_updated_at 
    BEFORE UPDATE ON public.salary_full 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- salesorderテーブルの更新トリガー
DROP TRIGGER IF EXISTS update_salesorder_updated_at ON public.salesorder;
CREATE TRIGGER update_salesorder_updated_at 
    BEFORE UPDATE ON public.salesorder 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- serviceorderテーブルの更新トリガー
DROP TRIGGER IF EXISTS update_serviceorder_updated_at ON public.serviceorder;
CREATE TRIGGER update_serviceorder_updated_at 
    BEFORE UPDATE ON public.serviceorder 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- callmanagerテーブルの更新トリガー
DROP TRIGGER IF EXISTS update_callmanager_updated_at ON public.callmanager;
CREATE TRIGGER update_callmanager_updated_at 
    BEFORE UPDATE ON public.callmanager 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- notificationsテーブルの更新トリガー
DROP TRIGGER IF EXISTS update_notifications_updated_at ON public.notifications;
CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON public.notifications 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- project_variableテーブルの更新トリガー
DROP TRIGGER IF EXISTS update_project_variable_updated_at ON public.project_variable;
CREATE TRIGGER update_project_variable_updated_at 
    BEFORE UPDATE ON public.project_variable 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- shiftテーブルの更新トリガー
DROP TRIGGER IF EXISTS update_shift_updated_at ON public.shift;
CREATE TRIGGER update_shift_updated_at 
    BEFORE UPDATE ON public.shift 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- 初期データ
-- ========================================

-- 初期追加料金データ
INSERT INTO public.add_charges (charge_name, value, other) VALUES
    ('main', 0.00, NULL),
    ('inside', 0.00, NULL),
    ('together', 0.00, NULL),
    ('bottle_keep', 0.00, NULL),
    ('vip_room', 0.00, NULL),
    ('song_room', 0.00, NULL)
ON CONFLICT (charge_name) DO NOTHING;

-- ========================================
-- マイグレーション完了
-- ========================================

-- このファイルはPostgreSQL 17.7で実行可能です
-- 使用方法:
-- psql -U postgres -d your_database_name -f database/migration_complete.sql

