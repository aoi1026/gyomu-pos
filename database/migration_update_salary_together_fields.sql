-- Update salary table: remove bottle_back_yen, ensure food_back_yen exists, add together nomination fields
-- Safe, idempotent alterations

ALTER TABLE IF EXISTS salary
  DROP COLUMN IF EXISTS bottle_back_yen;

ALTER TABLE IF EXISTS salary
  ADD COLUMN IF NOT EXISTS food_back_yen DECIMAL(12,2) DEFAULT 0.00 CHECK (food_back_yen >= 0);

ALTER TABLE IF EXISTS salary
  ADD COLUMN IF NOT EXISTS together_nomination_count INTEGER DEFAULT 0 CHECK (together_nomination_count >= 0),
  ADD COLUMN IF NOT EXISTS together_nomination_fee DECIMAL(12,2) DEFAULT 0.00 CHECK (together_nomination_fee >= 0);

-- Note: total_pay_yen is not recalculated here; application layer will handle updates.


