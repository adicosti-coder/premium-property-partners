-- Property Management collaboration leads (Booking/Airbnb hosts in Timișoara)
-- These are NEVER published on realtrust.ro. They feed Andrei's PM outreach pipeline.
CREATE TABLE IF NOT EXISTS public.pm_collaboration_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('booking','airbnb','other')),
  source_url TEXT NOT NULL UNIQUE,
  property_name TEXT,
  host_name TEXT,
  host_profile_url TEXT,
  zone TEXT,
  city TEXT DEFAULT 'Timișoara',
  rating NUMERIC,
  reviews_count INTEGER,
  price_per_night NUMERIC,
  currency TEXT DEFAULT 'EUR',
  property_type TEXT,
  rooms INTEGER,
  capacity INTEGER,
  amenities TEXT[],
  images TEXT[],
  description TEXT,
  ai_summary TEXT,
  ai_pitch TEXT, -- generated pitch for Andrei to use
  pm_potential_score INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewed','sent_to_andrei','contacted','onboarded','declined','blacklisted')),
  sent_to_andrei_at TIMESTAMPTZ,
  contacted_at TIMESTAMPTZ,
  notes TEXT,
  discovered_via TEXT, -- keyword id or label
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pm_leads_status ON public.pm_collaboration_leads(status);
CREATE INDEX IF NOT EXISTS idx_pm_leads_platform ON public.pm_collaboration_leads(platform);
CREATE INDEX IF NOT EXISTS idx_pm_leads_created ON public.pm_collaboration_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pm_leads_score ON public.pm_collaboration_leads(pm_potential_score DESC);

ALTER TABLE public.pm_collaboration_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage pm_collaboration_leads"
ON public.pm_collaboration_leads
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_pm_leads_updated_at
BEFORE UPDATE ON public.pm_collaboration_leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();