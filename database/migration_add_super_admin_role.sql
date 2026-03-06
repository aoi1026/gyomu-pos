-- super_admin ロール追加 & 初期super_adminアカウントを設定
-- 既存DB向け（CHECK制約名が不明でも動くように動的に置換）

DO $$
DECLARE
  c_name text;
BEGIN
  -- role IN (...) のCHECK制約を探して置換（存在する場合のみ）
  SELECT conname
    INTO c_name
  FROM pg_constraint
  WHERE conrelid = 'public."user"'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%role IN%';

  IF c_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public."user" DROP CONSTRAINT %I', c_name);
  END IF;

  -- 新しいCHECK制約を追加（重複エラーは無視）
  BEGIN
    EXECUTE 'ALTER TABLE public."user" ADD CONSTRAINT user_role_check CHECK (role IN (''admin'', ''cast'', ''manager'', ''super_admin''))';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- admin@example.com を super_admin に更新/作成
INSERT INTO public."user" (name, mail, password, role, drink_back, food_back, main_nomination, inside_nomination, other)
VALUES ('システム管理者', 'admin@example.com', 'b161b045b298f9abb4e4767d839c4bbe', 'super_admin', 0, 0, 0, 0, '')
ON CONFLICT (mail) DO UPDATE SET
  name = EXCLUDED.name,
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  updated_at = CURRENT_TIMESTAMP;


