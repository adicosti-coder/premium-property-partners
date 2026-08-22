ALTER TABLE public.owner_contracts
  ADD COLUMN IF NOT EXISTS line_items jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS photo_session_included boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS photo_session_fee_cents integer NOT NULL DEFAULT 50000,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS payment_intent_id text,
  ADD COLUMN IF NOT EXISTS charge_id text,
  ADD COLUMN IF NOT EXISTS receipt_url text,
  ADD COLUMN IF NOT EXISTS owner_portal_code text,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_amount_cents integer;

CREATE INDEX IF NOT EXISTS idx_owner_contracts_portal_code ON public.owner_contracts(owner_portal_code);