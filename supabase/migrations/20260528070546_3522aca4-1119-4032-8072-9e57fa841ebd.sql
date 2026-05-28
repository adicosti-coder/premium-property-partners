-- 1. Status enum
DO $$ BEGIN
  CREATE TYPE public.indexnow_actual_status AS ENUM ('pending', 'indexed', 'missing');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Extend indexnow_pings
ALTER TABLE public.indexnow_pings
  ADD COLUMN IF NOT EXISTS actual_indexing_status public.indexnow_actual_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS last_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS priority smallint NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_indexnow_pings_status
  ON public.indexnow_pings(actual_indexing_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_indexnow_pings_failed
  ON public.indexnow_pings(success, created_at DESC) WHERE success = false;

-- 3. Reindex queue
CREATE TABLE IF NOT EXISTS public.indexnow_reindex_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL UNIQUE,
  priority smallint NOT NULL DEFAULT 0,
  reason text,
  last_pinged_at timestamptz,
  ping_count integer NOT NULL DEFAULT 0,
  next_ping_after timestamptz NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.indexnow_reindex_queue TO authenticated;
GRANT ALL ON public.indexnow_reindex_queue TO service_role;

ALTER TABLE public.indexnow_reindex_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read reindex queue"
  ON public.indexnow_reindex_queue FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins manage reindex queue"
  ON public.indexnow_reindex_queue FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_reindex_queue_next
  ON public.indexnow_reindex_queue(next_ping_after) WHERE active = true;

-- 4. Seed premium hubs as priority entries
INSERT INTO public.indexnow_reindex_queue (url, priority, reason)
VALUES
  ('https://www.realtrust.ro/', 10, 'homepage'),
  ('https://www.realtrust.ro/complexe', 9, 'hub'),
  ('https://www.realtrust.ro/complexe/isho', 10, 'priority_hub'),
  ('https://www.realtrust.ro/complexe/paltim', 10, 'priority_hub'),
  ('https://www.realtrust.ro/complexe/city-of-mara', 10, 'priority_hub'),
  ('https://www.realtrust.ro/complexe/fructus-plaza', 9, 'priority_hub'),
  ('https://www.realtrust.ro/proprietati', 8, 'catalog')
ON CONFLICT (url) DO NOTHING;