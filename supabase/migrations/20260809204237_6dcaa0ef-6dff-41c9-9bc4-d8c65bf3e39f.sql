CREATE TABLE public.capi_delivery_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  event_id TEXT NOT NULL,
  dry_run BOOLEAN NOT NULL DEFAULT false,
  ok BOOLEAN NOT NULL DEFAULT false,
  http_status INTEGER,
  outcome TEXT NOT NULL DEFAULT 'sent',
  error_detail TEXT,
  event_source_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT ALL ON public.capi_delivery_log TO service_role;
GRANT SELECT ON public.capi_delivery_log TO authenticated;

ALTER TABLE public.capi_delivery_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view capi delivery log"
ON public.capi_delivery_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_capi_delivery_log_created_at ON public.capi_delivery_log (created_at DESC);

CREATE OR REPLACE FUNCTION public.cleanup_capi_delivery_log()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.capi_delivery_log WHERE created_at < now() - interval '30 days';
$$;