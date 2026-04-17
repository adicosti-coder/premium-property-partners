-- Migrate remaining archived leads into prospect_listings
INSERT INTO public.prospect_listings (
  source_platform,
  source_url,
  title,
  description,
  price,
  currency,
  location,
  contact_phone,
  contact_name,
  score,
  lead_score,
  status,
  lifecycle_status,
  admin_notes,
  tags,
  prospect_type,
  scraped_at,
  migrated_from_scraper_id,
  call_summary
)
SELECT
  COALESCE(a.source, 'OLX')                                   AS source_platform,
  a.url                                                       AS source_url,
  a.title,
  a.seo_description                                           AS description,
  NULLIF(a.original_price, 0)                                 AS price,
  'EUR'                                                       AS currency,
  a.location,
  a.phone                                                     AS contact_phone,
  a.agency_name                                               AS contact_name,
  a.lead_score                                                AS score,
  a.lead_score                                                AS lead_score,
  COALESCE(a.status, 'new')                                   AS status,
  'new'::public.lead_lifecycle_status                         AS lifecycle_status,
  a.admin_notes,
  COALESCE(a.tags, '{}'::text[])                              AS tags,
  CASE
    WHEN a.agency_name IS NOT NULL AND length(a.agency_name) > 0 THEN 'agentie'
    ELSE 'proprietar'
  END                                                         AS prospect_type,
  COALESCE(a.created_at, now())                               AS scraped_at,
  a.id                                                        AS migrated_from_scraper_id,
  a.call_summary
FROM public.scraper_leads_archive_2026 a
WHERE a.url IS NOT NULL
  AND a.url <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.prospect_listings p WHERE p.source_url = a.url
  )
ON CONFLICT (source_url) DO NOTHING;

-- Index for the pending_credentials queue
CREATE INDEX IF NOT EXISTS idx_prospect_listings_pending_creds
  ON public.prospect_listings (lifecycle_status, lead_score DESC)
  WHERE lifecycle_status = 'pending_credentials';