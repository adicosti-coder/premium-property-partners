
-- Settings singleton table for prospect rejection alerts
CREATE TABLE IF NOT EXISTS public.prospect_alert_settings (
  id smallint PRIMARY KEY DEFAULT 1,
  recipient_emails text[] NOT NULL DEFAULT '{}',
  recipient_phones text[] NOT NULL DEFAULT '{}',
  dominance_warning_ratio numeric NOT NULL DEFAULT 0.70,
  dominance_critical_ratio numeric NOT NULL DEFAULT 0.85,
  dominance_min_total integer NOT NULL DEFAULT 10,
  spike_warning_ratio numeric NOT NULL DEFAULT 1.50,
  spike_critical_ratio numeric NOT NULL DEFAULT 3.00,
  spike_min_count integer NOT NULL DEFAULT 5,
  surge_threshold integer NOT NULL DEFAULT 50,
  sms_min_severity text NOT NULL DEFAULT 'critical' CHECK (sms_min_severity IN ('warning','critical')),
  email_min_severity text NOT NULL DEFAULT 'warning' CHECK (email_min_severity IN ('info','warning','critical')),
  notifications_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT prospect_alert_settings_singleton CHECK (id = 1)
);

INSERT INTO public.prospect_alert_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.prospect_alert_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view alert settings" ON public.prospect_alert_settings;
CREATE POLICY "Admins can view alert settings"
  ON public.prospect_alert_settings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update alert settings" ON public.prospect_alert_settings;
CREATE POLICY "Admins can update alert settings"
  ON public.prospect_alert_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert alert settings" ON public.prospect_alert_settings;
CREATE POLICY "Admins can insert alert settings"
  ON public.prospect_alert_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND id = 1);

CREATE OR REPLACE FUNCTION public.touch_prospect_alert_settings()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prospect_alert_settings_touch ON public.prospect_alert_settings;
CREATE TRIGGER prospect_alert_settings_touch
  BEFORE UPDATE ON public.prospect_alert_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_prospect_alert_settings();
