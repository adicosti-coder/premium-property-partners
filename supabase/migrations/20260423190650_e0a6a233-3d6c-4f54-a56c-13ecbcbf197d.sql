
ALTER TABLE public.prospect_listings
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_failure_reason TEXT;

-- Add 'failed' to the lifecycle enum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'failed'
      AND enumtypid = 'public.lead_lifecycle_status'::regtype
  ) THEN
    ALTER TYPE public.lead_lifecycle_status ADD VALUE 'failed';
  END IF;
END $$;
