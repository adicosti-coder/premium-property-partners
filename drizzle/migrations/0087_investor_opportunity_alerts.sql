CREATE TABLE public.investor_alert_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_normalized text NOT NULL UNIQUE,
  name text,
  zones text[] NOT NULL DEFAULT '{}',
  max_price numeric,
  min_score integer NOT NULL DEFAULT 80,
  consent_text text NOT NULL,
  consented_at timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.investor_alert_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid NOT NULL REFERENCES public.investor_alert_subscribers(id) ON DELETE CASCADE,
  prospect_listing_id uuid NOT NULL,
  score integer,
  status text NOT NULL DEFAULT 'pending',
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subscriber_id, prospect_listing_id)
);
GRANT SELECT ON public.investor_alert_subscribers TO authenticated;
GRANT ALL ON public.investor_alert_subscribers TO service_role;
GRANT SELECT ON public.investor_alert_deliveries TO authenticated;
GRANT ALL ON public.investor_alert_deliveries TO service_role;
ALTER TABLE public.investor_alert_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_alert_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read investor subscribers" ON public.investor_alert_subscribers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read investor deliveries" ON public.investor_alert_deliveries FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));