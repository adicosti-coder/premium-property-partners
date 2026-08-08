CREATE TABLE IF NOT EXISTS public.request_idempotency (
  key text NOT NULL,
  scope text NOT NULL DEFAULT 'submit-lead',
  response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 seconds',
  PRIMARY KEY (scope, key)
);

GRANT ALL ON public.request_idempotency TO service_role;

ALTER TABLE public.request_idempotency ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service role manages idempotency keys" ON public.request_idempotency;
CREATE POLICY "service role manages idempotency keys"
  ON public.request_idempotency FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_request_idempotency_expires ON public.request_idempotency (expires_at);

CREATE OR REPLACE FUNCTION public.purge_expired_idempotency_keys()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE deleted integer;
BEGIN
  DELETE FROM public.request_idempotency WHERE expires_at < now() - interval '5 minutes';
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_idempotency_keys() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_idempotency_keys() TO service_role;