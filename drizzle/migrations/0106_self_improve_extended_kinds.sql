ALTER TABLE public.content_improvements DROP CONSTRAINT IF EXISTS content_improvements_kind_check;
ALTER TABLE public.content_improvements ADD CONSTRAINT content_improvements_kind_check CHECK (kind = ANY (ARRAY['blog_seo','social_tone','social_hashtags','social_caption','blog_topic','insight','wa_message','wa_hours','prospect_source','andrei_rule','social_hours','social_featured','integration_retry','lead_archive','cta_ab']));
ALTER TABLE public.content_improvements DROP CONSTRAINT IF EXISTS content_improvements_status_check;
ALTER TABLE public.content_improvements ADD CONSTRAINT content_improvements_status_check CHECK (status = ANY (ARRAY['pending','applied','rejected','failed','rolled_back']));
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS archived_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_leads_archived_at ON public.leads (archived_at);