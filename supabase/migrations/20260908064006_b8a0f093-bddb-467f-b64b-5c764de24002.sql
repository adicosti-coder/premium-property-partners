ALTER TABLE public.wa_agent_settings
  ADD COLUMN IF NOT EXISTS outbound_send_start_hour integer NOT NULL DEFAULT 9,
  ADD COLUMN IF NOT EXISTS outbound_send_end_hour integer NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS outbound_send_days integer[] NOT NULL DEFAULT '{1,2,3,4,5,6}',
  ADD COLUMN IF NOT EXISTS outbound_followup_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS outbound_followup_after_hours integer NOT NULL DEFAULT 48,
  ADD COLUMN IF NOT EXISTS outbound_followup_template text NOT NULL DEFAULT 'andrei_followup_ro',
  ADD COLUMN IF NOT EXISTS outbound_followup_max_per_run integer NOT NULL DEFAULT 20;

INSERT INTO public.automation_jobs (job_key, category, label, description, enabled, schedule, trigger_type, config)
VALUES
  ('wa.outbound_drain', 'lead', 'WhatsApp — golire coadă outbound',
   'Trimite automat mesajele din coada WhatsApp, respectând limitele pe oră/zi și intervalul orar permis.',
   true, '*/15 9-19 * * 1-6', 'cron', '{"batch_size": 5, "timeout_ms": 50000}'::jsonb),
  ('wa.followup_nudge', 'lead', 'WhatsApp — follow-up automat',
   'Pune în coadă un singur mesaj de follow-up pentru proprietarii care nu au răspuns la primul mesaj.',
   true, '30 10 * * 1-6', 'cron', '{"timeout_ms": 30000}'::jsonb)
ON CONFLICT (job_key) DO NOTHING;