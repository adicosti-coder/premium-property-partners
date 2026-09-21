ALTER TABLE public.prospect_listings
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_prospect_listings_published_at
  ON public.prospect_listings (published_at DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS public.owner_outreach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_listing_id UUID NOT NULL REFERENCES public.prospect_listings(id) ON DELETE CASCADE,
  offer_price NUMERIC,
  currency TEXT NOT NULL DEFAULT 'EUR',
  duration_months INTEGER,
  message TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_owner_outreach_listing
  ON public.owner_outreach_messages (prospect_listing_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.owner_outreach_messages TO authenticated;
GRANT ALL ON public.owner_outreach_messages TO service_role;

ALTER TABLE public.owner_outreach_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage owner outreach messages"
ON public.owner_outreach_messages
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));