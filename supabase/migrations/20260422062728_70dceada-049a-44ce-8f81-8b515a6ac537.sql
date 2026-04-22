CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_source ON public.leads (source) WHERE source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_unread_recent ON public.leads (is_read, created_at DESC) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads (email) WHERE email IS NOT NULL;