-- One row per calculator lead and month for the monthly market alert sent to Make.com.
-- Unique (lead_id, period_month) is the atomic claim: two clicks never send twice.
CREATE TABLE public.market_alert_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  period_month date NOT NULL,
  contact_key text NOT NULL,
  zone_key text NOT NULL,
  status text NOT NULL DEFAULT 'sending',
  payload jsonb NOT NULL,
  http_status integer,
  error text,
  triggered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  CONSTRAINT market_alert_deliveries_status_check CHECK (status IN ('sending','sent','failed')),
  CONSTRAINT market_alert_deliveries_unique UNIQUE (lead_id, period_month)
);

CREATE INDEX market_alert_deliveries_contact_idx ON public.market_alert_deliveries (contact_key, period_month DESC);

GRANT SELECT ON public.market_alert_deliveries TO authenticated;
GRANT ALL ON public.market_alert_deliveries TO service_role;

ALTER TABLE public.market_alert_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read market alert deliveries"
ON public.market_alert_deliveries
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));