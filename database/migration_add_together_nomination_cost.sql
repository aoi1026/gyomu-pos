-- Migration: Add together_nomination_cost to salary table
-- Date: 2025-11-12
-- Description: Add together_nomination_cost field to store the editable together nomination cost value

-- Add together_nomination_cost column to salary table
ALTER TABLE salary ADD COLUMN IF NOT EXISTS together_nomination_cost DECIMAL(12,2) DEFAULT 0.00 CHECK (together_nomination_cost >= 0);

-- Add comment
COMMENT ON COLUMN salary.together_nomination_cost IS '同伴者の金額（編集可能）';

