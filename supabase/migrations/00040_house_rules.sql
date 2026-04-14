-- ============================================================================
-- 00040: Regole della casa (house rules) per accommodations
-- ============================================================================

ALTER TABLE accommodations
  ADD COLUMN smoking_allowed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN children_allowed BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN parties_allowed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN quiet_hours_start TIME,
  ADD COLUMN quiet_hours_end TIME,
  ADD COLUMN house_rules_notes TEXT;
