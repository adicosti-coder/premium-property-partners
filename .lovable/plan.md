# Sprint 1 — Restul implementării

Confirmări încorporate: skip UsersManager & CommunicationLogsPanel, `ScraperLeadsManager = ScraperMonitorPanel`, reveal 30s, page size 25.

## C1 — Paginare + `select` explicit

Toate cele 6 fișiere primesc:
- `select("id, col1, col2, ...")` explicit (nu `*`)
- `usePaginatedQuery` cu `pageSize = 25`, count `exact` server-side
- `<AdminPagination />` sub tabel/list
- filtre existente propagate în `queryKey` + `filters` (nu client-side pe toată lista)

| Fișier | Tabel | Sortare implicită | Filtre server-side |
|---|---|---|---|
| `LeadsManager.tsx` | `leads` | `created_at desc` | status, source, search (ilike name/phone/email) |
| `PropertyManager.tsx` | `properties` | `updated_at desc` | zone, listing_type, is_active, search (ilike title) |
| `ScraperMonitorPanel.tsx` | `scraper_leads_archive_2026` | `created_at desc` | status, source, zone, search |
| `AutomationManager.tsx` (tab Runs) | `automation_runs` | `started_at desc` | status, job_key |
| `BlogManager.tsx` | `blog_articles` | `updated_at desc` | status, category, search (ilike title/slug) |
| `AuditLogViewer.tsx` | `admin_audit_log` | `created_at desc` | action, severity, entity |

Restul tab-urilor din AutomationManager (jobs, anomalies) rămân ca sunt — doar tab-ul Runs a fost flag-uit în audit.

## C2 — Cleanup realtime (`useRealtimeChannel`)

Rescriu 4 fișiere să folosească hook-ul unificat: key stabil, `.on()` fluent înainte de `subscribe`, `removeChannel` garantat în cleanup.

- `BlogLiveActivity.tsx` — un singur channel `blog-live-activity` cu 3 `.on()` (auto_publish_logs, indexnow_pings, blog_ai_snapshots)
- `AutomationLiveLogs.tsx` — channel `automation-live-logs`
- `VoiceAgentMonitoring.tsx` — channel `voice-agent-monitoring` (verifică subscripțiile existente)
- `ScraperMonitorPanel.tsx` — channel `scraper-monitor`

Hook-ul acceptă array de handlers; extind dacă e nevoie (semnătură actuală suportă un handler unic — dacă e limitat, îl fac să accepte listă).

## C3 — Mascare PII pe scraper

`ScraperMonitorPanel.tsx`: coloana `seller_phone` (și `seller_name` dacă e afișat) devine `<RevealableField>` cu `entity_type="scraper_lead"`, `field="seller_phone"`. Reveal loghează în `admin_access_logs` prin RPC-ul existent `log_pii_reveal`. Auto-mask 30s (default hook).

## C4 — Hardening RPC destructive

Funcții SECURITY DEFINER cu efect destructiv, în afară de `blog_rollback_ai_snapshot` (deja făcut):

1. `delete_email(uuid)` — verifică `has_role(auth.uid(), 'admin')` la începutul funcției, `RAISE EXCEPTION` altfel. Log în `admin_audit_log`.
2. `reset_prospect_invalid_status(...)` — admin gate + audit log.
3. `revoke_admin_mfa(uuid)` — admin gate + audit log; permite self-revoke (auth.uid() = target).
4. `seo_premium_plus_rollback_override(...)` — admin gate + audit log.

Migrația va face `CREATE OR REPLACE FUNCTION` cu semnăturile exacte, păstrând returnurile.

Nu ating `enforce_agency_blocklist_on_prospect` / `enforce_property_has_images` (triggere, nu callable din client).

## C5 — Split fișiere

Doar pe cele 3 atinse deja:

```
src/components/admin/
  blog/
    hooks/useBlogArticles.ts         (paginated query + mutations)
    columns/blogColumns.tsx          (table column defs)
    dialogs/BlogArticleEditor.tsx    (form dialog — extras)
  property/
    hooks/useProperties.ts
    columns/propertyColumns.tsx
    dialogs/PropertyEditor.tsx
  scraper/
    hooks/useScraperLeads.ts
    columns/scraperColumns.tsx
    dialogs/ScraperLeadDetail.tsx
```

`BlogManager.tsx` / `PropertyManager.tsx` / `ScraperMonitorPanel.tsx` devin containere subțiri (~300-400 linii) — layout, tabs, orchestrare. Toată logica de fetch/mutate/render row migrează în sub-module. Fără schimbări funcționale.

## Verificare finală

- `bunx tsgo --noEmit` clean
- Nu se face deploy — aștept confirmarea ta pe diff.

## Riscuri / assumptions

- Extind `useRealtimeChannel` să accepte multiple `.on()` handlers dacă versiunea curentă e single-handler.
- Nu convertesc filtrele existente la form controllat React Query dacă asta ar rupe UX (păstrez debounce pe search).
- Splittings-urile mută cod fără să schimbe comportament — nu refactorizez logica de business în această iterație.
