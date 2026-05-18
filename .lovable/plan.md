# Audit Automation Control Center + Roadmap Premium

## Stare actuală (verificat în DB + cod)

- **28 joburi** înregistrate în `automation_jobs` (lead: 8, seo: 12, blog: 3, ai: 2, system: 3).
- **0 rulaje efective**: toate au `last_run_at = NULL`, `total_runs = 0`. Nimic nu se execută în producție.
- **Nu există tabela `automation_runs`** — orchestratorul actualizează doar `last_run_at` pe job, fără istoric per-rulaj.
- **Orchestratorul nu e programat în `pg_cron`** (nu am acces la `cron.job`, dar absența totală a rulajelor + nicio referință în repo confirmă).
- **Parser cron incomplet**: suportă doar `*/N * * * *` și `M H * * *`. Eșuează tăcut pe `0 9 * * 1` (weekly), `0 8 1 * *` (monthly), `0 0 * * 0` (Sunday). Concret: peste 50% din joburile cron nu s-ar fi declanșat nici dacă orchestratorul ar fi rulat.
- **Timezone**: comparațiile sunt în UTC, dar utilizatorul gândește în Europe/Bucharest (`0 8 * * *` digest = 11:00 vara, nu 8:00).
- **Execuție serială** (`for … await`): un job lent blochează celelalte și depășește limita de 60s a unei invocări.
- **UI**: `CATEGORY_LABEL` din `AutomationManager.tsx` nu cunoaște `blog` și `ai` → joburile noi nu apar în niciun tab.
- **Lipsă retry/backoff/auto-disable** la `consecutive_failures`, fără SLA/timeout per job, fără notificări la eșec, fără realtime în Admin.

## Roadmap propus (3 valuri, livrabile distincte)

### Val 1 — Fundament executabil (CRITIC, fără asta nimic nu rulează)
1. **Migration**: tabela `automation_runs` (job_key, started_at, finished_at, duration_ms, status, error, output_summary jsonb, triggered_by). Index pe `(job_key, started_at desc)`.
2. **Rescriere parser cron** în orchestrator: suport complet pentru `m h dom mon dow` (lists, ranges, `*/N`, weekly, monthly). Folosesc bibliotecă mică (`croner` via npm).
3. **Timezone Europe/Bucharest** pentru evaluarea `isDue` (cu DST corect).
4. **`pg_cron` schedule** (prin tool insert, nu migration — conține anon key): un singur job la `*/5 * * * *` care invocă `automation-orchestrator`.
5. **Execuție paralelă cu cap de concurență** (default 4) + `Promise.allSettled` în loc de loop serial.
6. **SLA per job** (`config.timeout_ms`, default 50s) cu `AbortController` → marchează `timeout` în loc de hang.

### Val 2 — Reziliență & observabilitate
7. **Retry cu exponential backoff** pe joburile event-driven (`config.max_retries`, default 2).
8. **Auto-disable la 5 eșecuri consecutive** + insert `automation_anomalies` cu severity `critical` + notificare email admin (folosind infrastructura Resend deja existentă).
9. **Self-healing job real**: detectează joburi cu `last_run_at` mai vechi decât 2× scheduled interval → reactivează/alertează.
10. **Update `CATEGORY_LABEL`/`CATEGORY_ICON`** pentru `blog` (Newspaper) și `ai` (Brain). Fix imediat — joburile noi devin vizibile.
11. **Realtime în Admin**: subscribe pe `automation_jobs` + `automation_runs` → status live fără refresh manual.
12. **Tab nou "Istoric rulaje"** în AutomationManager: timeline cu durată, status, eroare, output, filtrabil per job/categorie.

### Val 3 — Premium / accelerare
13. **Heatmap zilnic** (recharts) pe pagina principală Automation: rulaje/ora din ultimele 7 zile, color-coded după success rate. Identifici instant orele cu eșecuri.
14. **Cost & latency dashboard**: media duration_ms per job + cost estimat (Gemini calls × tarif) → vezi unde să optimizezi.
15. **Dry-run în batch**: buton "Test toate joburile" → invocă orchestratorul cu `dry_run=true` și raportează ce ar fi rulat în următoarele 24h (preview cron schedule).
16. **Dependency graph**: declarativ în `config.depends_on` — `seo.weekly_report` așteaptă `seo.page_audit`. Orchestratorul respectă topologic ordinea.
17. **Webhook out** pentru evenimente critice (failed/disabled/anomaly) către Slack/Discord/Make.com — reutilizez patternul webhook deja existent.
18. **Smart scheduling**: orchestratorul detectează ferestre de trafic redus (din `cta_analytics`) și amână joburi grele pe noapte automat.

## Detalii tehnice

### Schema `automation_runs`
```sql
create table public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  job_key text not null references automation_jobs(job_key) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms integer,
  status text check (status in ('success','failed','timeout','skipped')),
  error text,
  triggered_by text,
  output_summary jsonb default '{}'::jsonb
);
create index on automation_runs (job_key, started_at desc);
```
RLS: admins citesc, doar `service_role` scrie.

### Fișiere atinse (Val 1+2)
- `supabase/migrations/...` — tabela `automation_runs`, update `automation_complete_run` să scrie și acolo.
- Insert SQL prin tool — `cron.schedule('automation-orchestrator-5m', ...)`.
- `supabase/functions/automation-orchestrator/index.ts` — parser nou, TZ, paralelism, timeout, retry.
- `supabase/functions/automation-self-healing/index.ts` — nou.
- `src/components/admin/AutomationManager.tsx` — categorii noi, tab Istoric, realtime, heatmap.

## Recomandare

Aprob Val 1 → live azi, joburile încep efectiv să ruleze. Val 2 + 3 în iterații separate ca să pot QA fiecare bucată în Preview.

Confirmi să încep cu **Val 1**?