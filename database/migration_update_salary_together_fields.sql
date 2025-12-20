-- Update salary table: add together nomination fields (legacy migration)
-- Safe, idempotent alterations

ALTER TABLE IF EXISTS salary
  DROP COLUMN IF EXISTS bottle_back_yen;

ALTER TABLE IF EXISTS salary
  -- food_back_yen は廃止（sales_back_yenへ統合）

ALTER TABLE IF EXISTS salary
  ADD COLUMN IF NOT EXISTS together_nomination_count INTEGER DEFAULT 0 CHECK (together_nomination_count >= 0),
  ADD COLUMN IF NOT EXISTS together_nomination_fee DECIMAL(12,2) DEFAULT 0.00 CHECK (together_nomination_fee >= 0);

-- Note: total_pay_yen is not recalculated here; application layer will handle updates.


