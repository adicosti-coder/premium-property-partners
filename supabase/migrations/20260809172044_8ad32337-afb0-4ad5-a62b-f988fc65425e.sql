-- 1) Vision result cache keyed by the image-set fingerprint
CREATE TABLE public.property_vision_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  images_hash TEXT NOT NULL UNIQUE,
  quality_score INTEGER NOT NULL,
  hotel_readiness INTEGER NOT NULL,
  images_analyzed INTEGER NOT NULL DEFAULT 0,
  model TEXT NOT NULL,
  analysis JSONB NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.property_vision_cache TO authenticated;
GRANT ALL ON public.property_vision_cache TO service_role;
ALTER TABLE public.property_vision_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view vision cache"
ON public.property_vision_cache FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_property_vision_cache_last_used ON public.property_vision_cache (last_used_at DESC);

-- 2) Manual override history, kept separate from the AI-generated result
CREATE TABLE public.property_quality_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id UUID NOT NULL REFERENCES public.prospect_listings(id) ON DELETE CASCADE,
  admin_id UUID,
  ai_quality_score INTEGER,
  previous_override JSONB,
  override JSONB NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.property_quality_overrides TO authenticated;
GRANT ALL ON public.property_quality_overrides TO service_role;
ALTER TABLE public.property_quality_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view quality overrides"
ON public.property_quality_overrides FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert quality overrides"
ON public.property_quality_overrides FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND admin_id = auth.uid());

CREATE INDEX idx_property_quality_overrides_prospect
ON public.property_quality_overrides (prospect_id, created_at DESC);

-- 3) Current manual override on the prospect (AI columns stay untouched)
ALTER TABLE public.prospect_listings
  ADD COLUMN IF NOT EXISTS quality_override JSONB,
  ADD COLUMN IF NOT EXISTS quality_override_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS quality_override_by UUID;

-- 4) Configurable vision settings (singleton row)
CREATE TABLE public.property_vision_settings (
  id SMALLINT NOT NULL DEFAULT 1 PRIMARY KEY CHECK (id = 1),
  vision_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_threshold INTEGER NOT NULL DEFAULT 70 CHECK (auto_threshold BETWEEN 0 AND 100),
  cache_enabled BOOLEAN NOT NULL DEFAULT true,
  cache_ttl_days INTEGER NOT NULL DEFAULT 90 CHECK (cache_ttl_days BETWEEN 1 AND 365),
  max_images INTEGER NOT NULL DEFAULT 5 CHECK (max_images BETWEEN 1 AND 10),
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.property_vision_settings TO authenticated;
GRANT ALL ON public.property_vision_settings TO service_role;
ALTER TABLE public.property_vision_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view vision settings"
ON public.property_vision_settings FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can upsert vision settings"
ON public.property_vision_settings FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update vision settings"
ON public.property_vision_settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.property_vision_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TRIGGER trg_property_vision_cache_updated_at
BEFORE UPDATE ON public.property_vision_cache
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_column();

CREATE TRIGGER trg_property_vision_settings_updated_at
BEFORE UPDATE ON public.property_vision_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_column();