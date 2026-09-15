-- Mesajul automat de ofertă: rulează la fiecare oră între 09:00 și 20:00
-- București (06–17 UTC), luni–sâmbătă, pentru discuțiile în care s-a ales un
-- apartament dar agentul nu a continuat discuția.
select cron.unschedule('wa-auto-offer-hourly')
where exists (select 1 from cron.job where jobname = 'wa-auto-offer-hourly');

select cron.schedule(
  'wa-auto-offer-hourly',
  '15 6-17 * * 1-6',
  $$
  select net.http_post(
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/wa-auto-offer',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', public.get_cron_reconcile_secret()
    ),
    body := jsonb_build_object('limit', 10, 'after_hours', 3)
  );
  $$
);