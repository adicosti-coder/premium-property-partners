-- A doua rulare automată a recontactării discuțiilor abandonate (17:00 Bucharest, luni-sâmbătă),
-- ca discuțiile fără răspuns să nu rămână neterminate până a doua zi dimineață.
select cron.unschedule('wa-reengage-abandoned-afternoon')
where exists (select 1 from cron.job where jobname = 'wa-reengage-abandoned-afternoon');

select cron.schedule(
  'wa-reengage-abandoned-afternoon',
  '0 14 * * 1-6',
  $$
  select net.http_post(
    url:='https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/wa-reengage-abandoned',
    headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret', public.get_cron_reconcile_secret()),
    body:='{"min_hours":24,"limit":10}'::jsonb
  ) as request_id;
  $$
);
