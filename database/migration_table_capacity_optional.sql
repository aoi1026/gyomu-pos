-- テーブル管理: 収容人数を未入力（NULL）で登録できるようにする
-- PostgreSQL では CHECK (capacity > 0) は NULL を許容するため、NOT NULL のみ解除する
ALTER TABLE "table" ALTER COLUMN capacity DROP NOT NULL;
