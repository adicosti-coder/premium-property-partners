ALTER TABLE public.prospect_listings
  ADD COLUMN IF NOT EXISTS owner_sentiment text CHECK (owner_sentiment IN ('presat', 'deschis', 'agentie', 'neutru')),
  ADD COLUMN IF NOT EXISTS urgency_level integer CHECK (urgency_level BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS migrated_from_scraper_id uuid;

INSERT INTO public.prospect_listings (
  id, title, description, price, currency, location, zone, prospect_type,
  contact_phone, contact_name, source_url, source_platform,
  lead_score, score, category, lifecycle_status, status,
  admin_notes, call_summary, auto_call_triggered_at, followup_sent_at,
  ai_score_breakdown, ai_scored_at, created_at, updated_at, migrated_from_scraper_id
)
SELECT
  gen_random_uuid(),
  sl.title,
  COALESCE(sl.seo_description, sl.whatsapp_message),
  sl.original_price,
  'EUR',
  sl.location,
  sl.neighborhood_slug,
  sl.listing_type,
  sl.phone,
  sl.agency_name,
  sl.url,
  COALESCE(sl.source, 'scraper_legacy'),
  COALESCE(sl.lead_score, 0),
  COALESCE(sl.lead_score, 0),
  CASE 
    WHEN sl.category::text IN ('hotelier','hotel_management','regim_hotelier') THEN 'hotelier'::public.offer_category
    WHEN sl.category::text IN ('inchiriere','rent') THEN 'inchiriere'::public.offer_category
    WHEN sl.category::text IN ('vanzare','sale') THEN 'vanzare'::public.offer_category
    WHEN lower(coalesce(sl.listing_type,'')) ~ '(hotelier|airbnb|booking|cazare|noapte)' THEN 'hotelier'::public.offer_category
    WHEN lower(coalesce(sl.listing_type,'')) ~ '(inchiri|chirie|rent|/lun)' THEN 'inchiriere'::public.offer_category
    ELSE 'vanzare'::public.offer_category
  END,
  CASE
    WHEN sl.lifecycle_status::text IN ('new','calling','interested','rejected','posted','scheduled','callback','no_answer','voicemail','converted') 
      THEN sl.lifecycle_status::text::public.lead_lifecycle_status
    ELSE 'new'::public.lead_lifecycle_status
  END,
  COALESCE(sl.status::text, 'new'),
  sl.admin_notes,
  sl.call_summary,
  sl.auto_call_triggered_at,
  sl.followup_sent_at,
  sl.ai_insight,
  sl.ai_insight_generated_at,
  sl.created_at,
  sl.updated_at,
  sl.id
FROM public.scraper_leads sl
WHERE NOT EXISTS (
  SELECT 1 FROM public.prospect_listings pl
  WHERE (sl.url IS NOT NULL AND pl.source_url = sl.url)
     OR (sl.phone IS NOT NULL AND pl.contact_phone = sl.phone AND pl.title = sl.title)
);

ALTER TABLE public.scraper_leads RENAME TO scraper_leads_archive_2026;

DROP TRIGGER IF EXISTS trigger_auto_call_high_score_lead ON public.scraper_leads_archive_2026;

ALTER TABLE public.scraper_leads_archive_2026 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "archive_admin_read_only" ON public.scraper_leads_archive_2026;
CREATE POLICY "archive_admin_read_only" ON public.scraper_leads_archive_2026
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_prospect_listings_dial_queue 
  ON public.prospect_listings (lead_score DESC, lifecycle_status, auto_call_triggered_at)
  WHERE lead_score > 80 AND lifecycle_status = 'new';

CREATE INDEX IF NOT EXISTS idx_prospect_listings_phone_norm
  ON public.prospect_listings (phone_normalized)
  WHERE phone_normalized IS NOT NULL;