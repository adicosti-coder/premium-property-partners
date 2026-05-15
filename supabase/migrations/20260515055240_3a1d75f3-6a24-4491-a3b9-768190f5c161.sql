select cron.schedule(
  'gsc-submit-sitemap-weekly',
  '0 5 * * 1',
  $$
  select net.http_post(
    url:='https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/gsc-submit-sitemap',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12enNzanl6YndjY2lvcXZoanBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MjQxNjIsImV4cCI6MjA4MjAwMDE2Mn0.60JJMqMaDwIz1KXi3AZNqOd0lUU9pu2kqbg3Os3qbC8"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);