
-- Daily GSC snapshot (per query+page+date) for long-horizon trend analysis
CREATE TABLE IF NOT EXISTS public.seo_gsc_daily (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  query TEXT NOT NULL DEFAULT '',
  page TEXT NOT NULL DEFAULT '',
  clicks INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  ctr NUMERIC(6,4) NOT NULL DEFAULT 0,
  position NUMERIC(6,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(date, query, page)
);
CREATE INDEX IF NOT EXISTS idx_gsc_daily_date ON public.seo_gsc_daily(date DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_daily_query ON public.seo_gsc_daily(query);
CREATE INDEX IF NOT EXISTS idx_gsc_daily_page ON public.seo_gsc_daily(page);

ALTER TABLE public.seo_gsc_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_select_gsc_daily" ON public.seo_gsc_daily FOR SELECT USING (has_role(auth.uid(),'admin'));
CREATE POLICY "service_all_gsc_daily" ON public.seo_gsc_daily FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- SEO opportunities detected by analyzer
CREATE TABLE IF NOT EXISTS public.seo_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- striking_distance | ctr_low | decay | cannibalization
  query TEXT,
  page TEXT,
  pages JSONB, -- for cannibalization
  current_position NUMERIC(6,2),
  current_clicks INTEGER,
  current_impressions INTEGER,
  current_ctr NUMERIC(6,4),
  potential_clicks INTEGER, -- impact score
  score INTEGER NOT NULL DEFAULT 0,
  details JSONB,
  ai_title TEXT,
  ai_meta TEXT,
  ai_actions JSONB,
  ai_generated_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open', -- open | applied | dismissed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_opp_status_score ON public.seo_opportunities(status, score DESC);
CREATE INDEX IF NOT EXISTS idx_opp_type ON public.seo_opportunities(type);
CREATE UNIQUE INDEX IF NOT EXISTS uq_opp_open ON public.seo_opportunities(type, COALESCE(query,''), COALESCE(page,'')) WHERE status = 'open';

ALTER TABLE public.seo_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_opp" ON public.seo_opportunities FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "service_all_opp" ON public.seo_opportunities FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- On-page audits via Firecrawl
CREATE TABLE IF NOT EXISTS public.seo_page_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page TEXT NOT NULL UNIQUE,
  title TEXT,
  meta_description TEXT,
  h1 TEXT,
  h2_count INTEGER DEFAULT 0,
  word_count INTEGER DEFAULT 0,
  schema_types TEXT[] DEFAULT ARRAY[]::TEXT[],
  internal_links INTEGER DEFAULT 0,
  external_links INTEGER DEFAULT 0,
  images_total INTEGER DEFAULT 0,
  images_missing_alt INTEGER DEFAULT 0,
  issues JSONB DEFAULT '[]'::jsonb,
  health_score INTEGER DEFAULT 0,
  last_scraped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audits_score ON public.seo_page_audits(health_score);
CREATE INDEX IF NOT EXISTS idx_audits_scraped ON public.seo_page_audits(last_scraped_at DESC);

ALTER TABLE public.seo_page_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_audits" ON public.seo_page_audits FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "service_all_audits" ON public.seo_page_audits FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Competitor SERP rankings
CREATE TABLE IF NOT EXISTS public.seo_competitor_rankings (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  query TEXT NOT NULL,
  domain TEXT NOT NULL, -- 'realtrust.ro' or competitor
  position INTEGER, -- null if not in top 10
  url TEXT,
  title TEXT,
  is_us BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(date, query, domain)
);
CREATE INDEX IF NOT EXISTS idx_comp_rank_query ON public.seo_competitor_rankings(query, date DESC);

ALTER TABLE public.seo_competitor_rankings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_comp_rank" ON public.seo_competitor_rankings FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "service_all_comp_rank" ON public.seo_competitor_rankings FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Anomaly alerts log (for dedup)
CREATE TABLE IF NOT EXISTS public.seo_anomaly_log (
  id BIGSERIAL PRIMARY KEY,
  alert_key TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_anomaly_key_sent ON public.seo_anomaly_log(alert_key, sent_at DESC);

ALTER TABLE public.seo_anomaly_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_select_anomaly" ON public.seo_anomaly_log FOR SELECT USING (has_role(auth.uid(),'admin'));
CREATE POLICY "service_all_anomaly" ON public.seo_anomaly_log FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
