CREATE TABLE public.indexnow_pings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  url TEXT NOT NULL,
  host TEXT NOT NULL,
  http_status INTEGER,
  success BOOLEAN NOT NULL DEFAULT false,
  response_body TEXT,
  triggered_by TEXT,
  batch_size INTEGER NOT NULL DEFAULT 1,
  error TEXT
);

CREATE INDEX idx_indexnow_pings_created_at ON public.indexnow_pings (created_at DESC);
CREATE INDEX idx_indexnow_pings_url ON public.indexnow_pings (url);

GRANT SELECT ON public.indexnow_pings TO authenticated;
GRANT ALL ON public.indexnow_pings TO service_role;

ALTER TABLE public.indexnow_pings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read indexnow pings"
ON public.indexnow_pings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.indexnow_pings;