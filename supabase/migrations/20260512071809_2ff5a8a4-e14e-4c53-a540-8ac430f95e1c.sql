ALTER TABLE phone_intelligence
  ADD COLUMN IF NOT EXISTS line_type text,
  ADD COLUMN IF NOT EXISTS carrier_name text,
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS lookup_at timestamptz,
  ADD COLUMN IF NOT EXISTS lookup_error text,
  ADD COLUMN IF NOT EXISTS is_unreachable boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_phone_intel_line_type ON phone_intelligence(line_type);
CREATE INDEX IF NOT EXISTS idx_phone_intel_lookup_pending ON phone_intelligence(last_seen DESC) WHERE lookup_at IS NULL;

ALTER TABLE voice_agent_settings
  ADD COLUMN IF NOT EXISTS amd_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS amd_timeout_seconds integer NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS skip_voip boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS skip_landline boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS predictive_sort_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS phone_lookup_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE voice_call_sessions
  ADD COLUMN IF NOT EXISTS amd_hangup boolean DEFAULT false;
