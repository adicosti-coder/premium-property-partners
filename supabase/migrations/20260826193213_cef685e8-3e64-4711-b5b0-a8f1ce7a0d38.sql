ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS status_token TEXT;

UPDATE public.leads SET status_token = encode(gen_random_bytes(16), 'hex') WHERE status_token IS NULL;

ALTER TABLE public.leads ALTER COLUMN status_token SET DEFAULT encode(gen_random_bytes(16), 'hex');
ALTER TABLE public.leads ALTER COLUMN status_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS leads_status_token_key ON public.leads (status_token);