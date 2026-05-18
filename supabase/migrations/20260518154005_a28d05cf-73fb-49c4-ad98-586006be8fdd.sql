
-- Extend allowed categories
ALTER TABLE public.automation_jobs DROP CONSTRAINT IF EXISTS automation_jobs_category_check;
ALTER TABLE public.automation_jobs ADD CONSTRAINT automation_jobs_category_check
  CHECK (category = ANY (ARRAY['lead'::text, 'seo'::text, 'system'::text, 'blog'::text, 'ai'::text]));

-- Register new automation jobs
INSERT INTO public.automation_jobs (job_key, category, label, description, enabled, schedule, trigger_type, config) VALUES
  ('blog.hub_clicks_weekly_digest', 'blog', 'Blog Hub · Digest Săptămânal',
   'Raport săptămânal pe email cu top locații, afișări, click-uri inline/card și CTR%.',
   true, '0 9 * * 1', 'cron', '{}'::jsonb),
  ('blog.sitemap_refresh', 'blog', 'Blog · Refresh Sitemap',
   'Regenerează sitemap-ul de blog pentru indexare rapidă a noilor articole.',
   true, '0 5 * * *', 'cron', '{}'::jsonb),
  ('blog.cta_dedup_server', 'blog', 'Blog · Dedup CTA Server-Side',
   'Trigger Postgres care suprimă click-urile duplicate pe hub în fereastră de 60s.',
   true, 'event-driven', 'event', '{"impl":"trigger:dedupe_hub_click_event_before_insert"}'::jsonb),
  ('seo.competitor_tracker', 'seo', 'SEO · Competitor Tracker',
   'Reîmprospătează zilnic pozițiile competitorilor pe queries strategice.',
   true, '0 6 * * *', 'cron', '{}'::jsonb),
  ('seo.opportunity_detector', 'seo', 'SEO · Detector Oportunități',
   'Identifică keyword opportunities și pagini cu potențial nevalorificat.',
   true, '0 7 * * *', 'cron', '{}'::jsonb),
  ('seo.page_audit', 'seo', 'SEO · Audit Pagini',
   'Audit zilnic al paginilor cu trafic mare / scor scăzut.',
   true, '0 5 * * *', 'cron', '{}'::jsonb),
  ('seo.indexing_alerts', 'seo', 'SEO · Alerte Indexare',
   'Alertează când pagini importante sunt deindexate de Google.',
   true, '0 11 * * *', 'cron', '{}'::jsonb),
  ('seo.monthly_snapshot', 'seo', 'SEO · Snapshot Lunar',
   'Snapshot lunar al metricilor SEO pentru trend istoric.',
   true, '0 8 1 * *', 'cron', '{}'::jsonb),
  ('seo.ai_optimizer_audit', 'seo', 'SEO · Audit AI Optimizer',
   'Rulează auditul AI per-URL cu Gemini + Firecrawl și generează sugestii.',
   true, '0 12 * * 2', 'cron', '{}'::jsonb),
  ('ai.bulk_cache_refresh', 'ai', 'AI · Refresh Cache Bulk',
   'Regenerează secvențial cache-ul AI pentru intrările stale.',
   true, '0 2 * * 0', 'cron', '{}'::jsonb),
  ('ai.memory_cross_function', 'ai', 'AI · Memory Cross-Function',
   'Agregare visitor memory (anonim + auth) pentru personalizare AI cross-funcțională.',
   true, 'event-driven', 'event', '{"impl":"edge:visitor-memory"}'::jsonb),
  ('prospect.predictive_rescore', 'lead', 'Prospect · Re-scoring Predictiv',
   'Recalculează zilnic scorul de conversie + undervaluation pentru prospecți activi.',
   true, '0 4 * * *', 'cron', '{}'::jsonb),
  ('prospect.predictive_score_on_insert', 'lead', 'Prospect · Scor Predictiv la Inserție',
   'Calculează scorul predictiv la inserția unui prospect nou (trigger).',
   true, 'event-driven', 'event', '{"impl":"trigger:prospect_predictive_score"}'::jsonb)
ON CONFLICT (job_key) DO UPDATE SET
  category = EXCLUDED.category,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  schedule = EXCLUDED.schedule,
  trigger_type = EXCLUDED.trigger_type,
  config = EXCLUDED.config,
  updated_at = now();
