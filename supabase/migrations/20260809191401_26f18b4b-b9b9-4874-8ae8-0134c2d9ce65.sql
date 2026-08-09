CREATE TABLE IF NOT EXISTS public.wa_dnc_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_normalized text NOT NULL UNIQUE,
  reason text,
  label text NOT NULL DEFAULT 'manual',
  source text NOT NULL DEFAULT 'admin',
  added_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wa_dnc_list TO authenticated;
GRANT ALL ON public.wa_dnc_list TO service_role;

ALTER TABLE public.wa_dnc_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage DNC list"
  ON public.wa_dnc_list FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages DNC list"
  ON public.wa_dnc_list FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_wa_dnc_list_phone ON public.wa_dnc_list (phone_normalized);

CREATE TRIGGER trg_wa_dnc_list_updated_at
  BEFORE UPDATE ON public.wa_dnc_list
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_column();

ALTER TABLE public.wa_agent_settings
  ADD COLUMN IF NOT EXISTS outbound_auto_pause_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS outbound_min_delivery_rate integer NOT NULL DEFAULT 80,
  ADD COLUMN IF NOT EXISTS outbound_max_consecutive_failures integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS outbound_paused boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS outbound_paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS outbound_pause_reason text;