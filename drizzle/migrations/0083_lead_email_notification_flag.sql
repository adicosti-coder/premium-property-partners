ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS email_notification_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_notification_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_notification_grade text;
UPDATE public.leads l SET email_notification_sent = true,
  email_notification_sent_at = e.at
FROM (SELECT lead_id, max(created_at) at FROM public.lead_events
      WHERE event_type='team_email' AND status='success' GROUP BY lead_id) e
WHERE e.lead_id = l.id;
CREATE INDEX IF NOT EXISTS idx_leads_email_notif_sent_at ON public.leads (email_notification_sent_at) WHERE email_notification_sent;