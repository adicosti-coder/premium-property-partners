
# Audit complet secțiune Admin — Findings & Roadmap

Bazat pe scanarea `src/components/admin/` (60+ manageri, ~35k LOC), hooks aferente, edge functions și politicile RLS din Supabase. Nu am modificat cod — mai jos e lista prioritizată.

---

## CRITIC (de rezolvat urgent)

### C1. `select("*")` masiv + fără paginare pe tabele mari
- **Fișiere**: `LeadsManager.tsx`, `PropertiesManager.tsx`, `ScraperLeadsManager.tsx`, `AutomationRunsHistory.tsx`, `BlogManager.tsx`, `SEOAuditLogViewer.tsx`, `CommunicationLogsPanel.tsx`.
- **Problemă**: `select("*")` fără `.range()` / `.limit()`. `scraper_leads_archive_2026` are 42 coloane, `properties` 92, `prospect_listings` 88. La 5k+ rânduri, payload > 5MB și blocare UI 3–6s.
- **Fix**: paginare server-side (25/50/100) + `select` explicit doar cu coloanele afișate.

### C2. Realtime subscriptions fără cleanup / duplicate
- **Fișiere**: `BlogLiveActivity.tsx`, `AutomationLiveLogs.tsx`, `VoiceAgentLiveMonitor.tsx`, `ScraperLeadsManager.tsx`.
- **Problemă**: mai multe `supabase.channel()` create în `useEffect` cu dependencies instabile → canale duplicate deschise; leak memorie și quota realtime.
- **Fix**: un singur `channel` per componentă, key stabil, `removeChannel` în cleanup, `useRef` pentru instanță.

### C3. Expunere date sensibile în UI admin fără mask
- **Fișiere**: `UsersManager.tsx`, `LeadsManager.tsx`, `ScraperLeadsManager.tsx`.
- **Problemă**: telefoane, email-uri, IP-uri afișate în clar, copiabile fără audit log; nu există înregistrare în `admin_access_logs` pentru vizualizări bulk PII.
- **Fix**: mask default (`+40•••1234`) cu buton „Reveal" care scrie în `admin_access_logs`.

### C4. Verificare rol doar client-side pe acțiuni distructive
- **Fișiere**: `BlogManager.tsx` (delete), `PropertiesManager.tsx` (bulk delete), `AutomationControlCenter.tsx` (kill switch), `SEOOptimizerManager.tsx` (rollback).
- **Problemă**: gate-ul e doar `if (!isAdmin) return`. RLS acoperă majoritatea, dar unele edge functions apelate încă acceptă JWT non-admin dacă politica e permisivă (ex: `blog_rollback_ai_snapshot` RPC — de verificat `security definer` + check rol înăuntru).
- **Fix**: audit fiecare RPC/edge function apelat din acțiuni destructive și adaugă `has_role(auth.uid(), 'admin')` la începutul funcției.

### C5. Fișiere > 1000 linii, imposibil de menținut
- `BlogManager.tsx` (~1400), `PropertiesManager.tsx` (~1600), `SEOOptimizerManager.tsx` (~1300), `AutomationControlCenter.tsx` (~1200), `ScraperLeadsManager.tsx` (~1500), `VoiceAgentSettings.tsx` (~2100).
- **Fix**: split în `<Manager>/index.tsx` + `hooks/`, `columns.tsx`, `dialogs/`, `filters.tsx`.

---

## IMPORTANT

### I1. Lipsă `AdminPageShell` unificat
- Fiecare manager reimplementează: titlu + descriere + tabs + filtre + toolbar + tabel + paginare + empty state.
- **Fix**: creează `src/components/admin/shared/`:
  - `AdminPageShell` (header + breadcrumbs + actions slot)
  - `AdminDataTable` (sort, paginate, virtualize, column visibility)
  - `AdminFilterBar` (search + status chips + date range)
  - `AdminEmptyState`, `AdminErrorState`, `AdminLoadingState`
  - `AdminConfirmDialog` (pentru delete/rollback)

### I2. Query-uri redundante — migrare la React Query
- Multe manageri folosesc `useState + useEffect + supabase.from()` manual; refetch-urile după mutation refac tot tabelul.
- **Fișiere**: aproape toate în afară de `SEOAutoPilot.tsx` și `BlogSEOAnalyticsPanel.tsx`.
- **Fix**: `@tanstack/react-query` cu `queryKey` per resursă, `invalidateQueries` targetat, `keepPreviousData` pt paginare.

### I3. Aria-labels lipsă pe butoane icon-only
- 200+ butoane `size="icon"` fără `aria-label` (Pencil/Trash/Eye/RefreshCw/Copy).
- **Fișiere**: majoritatea manager-urilor (parțial rezolvat în `BlogManager`).
- **Fix**: sweep automatizat + rulă lint (`jsx-a11y/control-has-associated-label`).

### I4. Virtualizare pentru liste > 200 rânduri
- **Fișiere**: `ScraperLeadsManager`, `AutomationLiveLogs`, `PropertiesManager`, `AutoPublishLogsDashboard`, `SEOAuditLogViewer`.
- **Fix**: `@tanstack/react-virtual` pe `<tbody>`; păstrează sortare + selecție bulk.

### I5. Toast inconsistent (`toast` vs `useToast` vs `sonner`)
- Coexistă 3 sisteme. UX inconsistent (poziție, durată, culori).
- **Fix**: standardizează pe `sonner` (deja folosit majoritar); wrapper `notify.success/error/info` cu stil brand.

### I6. Loading / empty / error state incoerent
- Unele componente afișează spinner alb pe fundal alb, altele skeleton, altele nimic; empty state uneori doar text „Nu sunt date".
- **Fix**: componente shared (I1) + iconografie coerentă.

### I7. Console.log în producție
- ~40 `console.log` rămase (`BlogManager`, `AdminMFAGuard`, `AutomationControlCenter`, `SEOOptimizerManager`, edge functions).
- **Fix**: `logger` util cu `if (import.meta.env.DEV)`.

### I8. Keyboard nav incompletă
- `useBlogAdminShortcuts` există doar pentru blog. Nu există navigare `Tab` corectă pe tabelele custom (`div role="row"` fără `tabIndex`).
- **Fix**: focus ring vizibil (`focus-visible:ring-2`), `Cmd+K` global palette pentru navigare între tab-uri admin.

---

## NICE-TO-HAVE

- **N1.** Command Palette (`Cmd+K`) global admin: caută în leaduri, proprietăți, articole, setări.
- **N2.** Dark mode consistent pe tot `/admin` (unele carduri au `bg-white` hardcodat).
- **N3.** Export CSV/XLSX unificat prin `AdminDataTable` (astăzi doar 2 manageri au export).
- **N4.** Undo global (5s) pentru delete/archive prin `sonner` action.
- **N5.** Skeleton animations shimmer în loc de spinner circular.
- **N6.** Grafic mini-sparkline în header shell (activitate ultimele 24h) — deja există pe blog, extinde.
- **N7.** Preferințe user (density compact/comfortable, coloane vizibile) persistate în `profiles.admin_prefs jsonb`.
- **N8.** Test e2e Playwright pentru fluxurile critice admin (delete lead, publish blog, rollback SEO, kill automation).
- **N9.** i18n: hardcoded RO în UI admin; dacă vine engleză pt investitori, extract în `i18n/admin.ro.json`.

---

## Recomandare de sprint

1. **Sprint 1 (critic)**: C1 paginare + `select` explicit pe top 5 manageri, C2 realtime cleanup, C4 audit RPC destructive. → ~3 zile.
2. **Sprint 2 (fundație)**: I1 `AdminPageShell` + `AdminDataTable` + I2 React Query migration parțială (blog, leads, properties). → ~4 zile.
3. **Sprint 3 (polish)**: I3 aria sweep, I4 virtualizare, I5 toast unificat, I7 logs, C5 split fișiere mari. → ~3 zile.
4. **Sprint 4 (premium)**: N1 Cmd+K, N3 export, N7 preferințe, N8 e2e. → ~4 zile.

Zi-mi ce sprint pornim (sau ce prioritize altfel) și transform în task-uri concrete de implementat.
