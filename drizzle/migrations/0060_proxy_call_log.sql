CREATE TABLE public.proxy_call_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  provider text NOT NULL DEFAULT 'none',
  kind text NOT NULL DEFAULT 'other',
  domain text,
  url text,
  ok boolean NOT NULL DEFAULT false,
  status int,
  budget_exhausted boolean NOT NULL DEFAULT false,
  cost_credits numeric NOT NULL DEFAULT 0,
  function_name text NOT NULL DEFAULT 'scrape-prospects'
);

CREATE INDEX idx_proxy_call_log_created_at ON public.proxy_call_log (created_at DESC);
CREATE INDEX idx_proxy_call_log_domain ON public.proxy_call_log (domain, created_at DESC);

GRANT SELECT ON public.proxy_call_log TO authenticated;
GRANT ALL ON public.proxy_call_log TO service_role;

ALTER TABLE public.proxy_call_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read proxy call log"
ON public.proxy_call_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Service role manages proxy call log"
ON public.proxy_call_log FOR ALL TO service_role
USING (true) WITH CHECK (true);