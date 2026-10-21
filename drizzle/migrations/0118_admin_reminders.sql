-- Mementouri programate pentru administrare.
-- Un memento = un rând cu due_at; functions/admin-reminder-check îl trimite pe
-- email când a trecut termenul și îl marchează 'sent'. pg_cron verifică o dată
-- pe oră, deci un memento nu ajunge niciodată de două ori la destinatar.
CREATE TABLE public.admin_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  recipient text NOT NULL DEFAULT 'info@realtrust.ro',
  source text,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.admin_reminders IS 'Mementouri interne pentru echipă, trimise la termen pe email.';

GRANT SELECT, UPDATE ON public.admin_reminders TO authenticated;
GRANT ALL ON public.admin_reminders TO service_role;

ALTER TABLE public.admin_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read reminders"
  ON public.admin_reminders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can cancel reminders"
  ON public.admin_reminders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX admin_reminders_due_idx
  ON public.admin_reminders (status, due_at)
  WHERE status = 'pending';

-- Control zilnic: verifică mementourile ajunse la termen.
SELECT cron.schedule(
  'admin-reminder-check-hourly',
  '10 * * * *',
  $$select net.http_post(url:='https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/admin-reminder-check', headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',public.get_cron_reconcile_secret()), body:='{}'::jsonb, timeout_milliseconds:=60000)$$
);

-- Memento cerut de Adrian Costi pe 21 octombrie 2026: verificare presiune bază.
INSERT INTO public.admin_reminders (title, body, due_at, recipient, source) VALUES (
  'Verifică baza de date (presiune resurse)',
  E'Bună Adrian,

Ați stabilit marți, 21 octombrie, să mai așteptăm câteva zile înainte să decidem dacă trecem baza de date la o instanță mai mare.

Ce verificăm acum:
1. Dacă alerta de dimineață (DiskIO, în jurul orei 06:59) a apărut și în zilele următoare.
2. Dacă da, trecem la instanța Small: +50 credite/lună, adică ~122 în loc de ~72.
3. Dacă nu, rămânem la instanța actuală și continuăm optimizările.

Scrieți „verifică baza" și fac controlul complet în câteva minute.',
  '2026-10-23 06:00:00+00',
  'info@realtrust.ro',
  'user_request'
);