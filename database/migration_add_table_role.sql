-- userテーブルのroleカラムに'table'を追加するマイグレーション

-- 既存のCHECK制約を削除
ALTER TABLE "user" DROP CONSTRAINT IF EXISTS user_role_check;

-- 新しいCHECK制約を追加（'table'を含む）
ALTER TABLE "user" ADD CONSTRAINT user_role_check 
  CHECK (role IN ('admin', 'cast', 'manager', 'super_admin', 'table'));

COMMENT ON COLUMN "user".role IS 'ロール: admin, cast, manager, super_admin, table';
