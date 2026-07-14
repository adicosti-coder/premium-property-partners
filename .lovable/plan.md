# Audit Complet — Panoul de Administrare RealTrust

**Scope**: 45+ tab-uri lazy-loaded (`adminTabLoaders.ts`), ~120 componente în `src/components/admin/` + `src/components/admin/blog/`, `src/components/admin/outreach/`, hook-uri asociate, plus shell-ul din `src/pages/Admin.tsx`.

**Cifre relevante**: ~77.000 linii TSX în `src/components/admin/`, 12 fișiere >1000 linii, 258 cast-uri `as any`/`as never`, 41 fișiere pe `sonner` vs 73 pe `@/hooks/use-toast`, 88 apeluri `select("*")`, 0 folosiri de virtualizare, 20 fișiere care reinventează un tabel + căutare + filtre, 21 fișiere care reinventează export CSV, 27+ tab-uri fac fetch propriu fără `react-query`.

Nu s-a modificat cod. Mai jos, doar diagnostic + priorități.

---

## 🚨 CRITIC — de rezolvat înainte de următorul release

### 1. MFA bypass client-side în `AdminMFAGuard`
- **Fișier**: `src/components/admin/AdminMFAGuard.tsx` (linia 14–30)
- Verificarea "OTP autorizat" se face doar prin `sessionStorage.getItem("admin_otp_verified")` cu `timestamp` local. Orice utilizator care ajunge la `/admin` poate rula `sessionStorage.setItem("admin_otp_verified", JSON.stringify({timestamp: Date.now()}))` din DevTools și primește acces la întreg panoul fără să treacă prin `verify-admin-otp`.
- **Impact**: MFA-ul e cosmetic pentru un atacator cu sesiune de admin compromisă. Nu apără față de session hijacking și nu are nicio legătură cu backend-ul.
- **Fix**: Statul "OTP verificat" trebuie stocat server-side (ex. flag `mfa_verified_until` pe `profiles`/`admin_otp_codes`, verificat de o RPC `has_valid_admin_mfa()`) și interogat înainte să monteze conținutul admin. `sessionStorage` poate rămâne doar ca cache local, dar sursa de adevăr trebuie să fie DB.

### 2. Icon-only buttons fără `aria-label` în toți managerii mari
- **Fișiere** (grep confirmat): `BlogManager.tsx` (Pencil/Trash2, liniile 952–966), `PropertyManager.tsx`, `LeadsManager.tsx`, `ProspectManager.tsx`, `AutomationManager.tsx`, `POIManager.tsx`, `InvestitiiPremiumManager.tsx`, `SEOOptimizerManager.tsx`, `ScraperMonitorPanel.tsx`, `VoiceAgentManager.tsx`, `VoiceAgentBatchCalling.tsx`, `EmailCampaignManager.tsx`, `ReferralManager.tsx`, `FollowupStatsManager.tsx`, `NewsletterManager.tsx`, `DiscountCodeManager.tsx`, `CommunityManager.tsx`, `ReviewsManager.tsx`, ș.a. — 75 de instanțe `size="icon"` totale, majoritatea fără etichetă.
- **Impact**: NVDA/JAWS anunță "buton" fără nume. WCAG 4.1.2 fail direct.
- **Fix**: adaugă `aria-label` (ex. `aria-label="Editează articolul {title}"`, `aria-label="Șterge articolul {title}"`) sau înlocuiește cu un pattern reutilizabil `<IconButton icon={...} label="…" />`.

### 3. N+1 requests din `BlogRollbackButton` în tabelul de blog
- **Fișier**: `src/components/admin/blog/BlogRollbackButton.tsx` (linia 25–39) + folosit în `BlogManager.tsx` linia 948.
- Pentru fiecare rând din tabelul blogului se face un `select … from blog_ai_snapshots … maybeSingle()`. La 60 de articole = 60 de round-trip-uri Supabase la fiecare deschidere de tab.
- **Impact**: Prima încărcare a `/admin/blog` durează 3–8 s când există articole optimizate AI, spike de trafic la Supabase.
- **Fix**: fetch bulk în `BlogManager.fetchArticles` (`in("article_id", ids)`), pasează prin props snapshot-ul activ către `BlogRollbackButton`. Alternativ, JOIN implicit prin `select("*, active_ai_snapshot:blog_ai_snapshots(!inner)")` cu filter.

### 4. `Cmd/Ctrl+R` blocat global pe `/admin/blog`
- **Fișier**: `src/hooks/useBlogAdminShortcuts.ts` (linia 30–33).
- Handler-ul apelează `e.preventDefault()` pe **orice** `Cmd/Ctrl+R`, chiar și când focus-ul e într-un `<Input>`/`<Textarea>` (verificarea `isEditable` există doar pentru `Cmd/Ctrl+A`). Utilizatorul nu mai poate face refresh la pagină.
- **Impact**: DX și UX spart. Bug de tastatură pe care admin-ii îl vor semnala rapid.
- **Fix**: aplică `isEditable(e.target)` și pentru `r`. Redenumește shortcut-ul (`Shift+R` sau `Cmd+Shift+R`) fiindcă `Cmd+R` este rezervat browser reload.

### 5. Lipsă `ErrorBoundary` local pe `ActiveTabRenderer`
- **Fișier**: `src/pages/Admin.tsx` (linia 300–314).
- Managerii sunt lazy-loaded în `Suspense` fără `ErrorBoundary`. O eroare runtime dintr-un singur manager (de ex. un cast `as any` care primește `null`) va da crash la tot `/admin`, iar `ErrorBoundary` global din `App.tsx` te scoate din întreg app-ul.
- **Fix**: înfășoară `<Suspense><Component/></Suspense>` cu un `AdminErrorBoundary` local care afișează un fallback ("Această secțiune a eșuat la încărcare — Reîncearcă") și un buton de retry.

### 6. `select("*")` pe tabele foarte late
- **Fișiere reprezentative**: `PropertyManager.tsx` (properties, 92 coloane), `ProspectManager.tsx` linia 380 (prospect_listings, 88 coloane), `BlogManager.tsx` linia 333, `LeadsManager.tsx`, `InvestitiiPremiumManager.tsx`.
- Fetch de 500–10.000 rânduri × 90 coloane = payload de MB pe listări unde UI-ul afișează 6–8 coloane.
- **Fix**: explicit `select("id, title, is_active, price, …")`. Reduce timp de răspuns și memoria clientului cu 60–80%.

### 7. Lipsă virtualizare pe tabele mari
- **Fișiere**: `BlogCtaABDashboard.tsx` (limit 10.000), `CronMonitor.tsx` (limit 10.000), `AutomationAnalytics.tsx` (5.000), `EvaluareEngagementManager.tsx` (5.000), `BlogHubClicksDashboard.tsx` (5.000), `AuditLogViewer.tsx` (500), `ProspectManager.tsx` (500), `LeadsManager.tsx` (fără limit), `PropertyManager.tsx` (fără limit).
- `<TableRow>` × 500+ produce jank vizibil la sortare/filtrare și fum de RAM.
- **Fix**: `@tanstack/react-virtual` (deja compatibil cu shadcn `<Table>`, ceva cod glue) sau paginare cu `.range(from, to)`.

---

## 🟠 IMPORTANT — degradează experiența sau introduce risc mediu

### 8. Cast-uri `as any`/`as never` — 258 de instanțe
- **Fișiere hotspot**: `ScraperMonitorPanel.tsx`, `AutomationManager.tsx`, `ProspectManager.tsx`, `BlogManager.tsx`, `AutoPublishLogsDashboard.tsx`, `blog/BlogLiveActivity.tsx`, `blog/BlogRollbackButton.tsx`, `blog/BlogSEOAnalyticsPanel.tsx`.
- Motiv: tabelele generate în `src/integrations/supabase/types.ts` nu conțin `auto_publish_logs`, `blog_ai_snapshots`, `seo_gsc_daily` etc. Devs bypass-uiesc tipurile cu `as never`/`as any` → schema drift trece silențios (dacă redenumești o coloană nu observi până la runtime).
- **Fix**: regenerează `types.ts` (`supabase gen types`) după toate migrațiile recente și scoate cast-urile. Adaugă un check în CI care nu permite `as any` în `src/components/admin/`.

### 9. `useEffect(fetch, [])` peste tot în loc de `react-query`
- **Files**: 40+ manageri (`LeadsManager.tsx`, `PropertyManager.tsx`, `BlogManager.tsx`, `ProspectManager.tsx`, `AutomationManager.tsx`, `POIManager.tsx`, `InvestitiiPremiumManager.tsx`, `VoiceAgentManager.tsx`, `SEOOptimizerManager.tsx`, `ReferralManager.tsx`, `MaintenanceManager.tsx`, ...). Doar 54 din 120 folosesc `useQuery`.
- **Impact**: nici un cache între tab-uri (schimbi tab și te întorci → refetch complet), nici o dedupare de request-uri, nu se pot invalida elegant.
- **Fix**: migrați treptat pe `useQuery`/`useMutation` cu `queryKey`-uri stabile. Ideal, un fișier `src/lib/adminQueries.ts` cu factory de query-uri reutilizabile.

### 10. `AdminDashboard` — 10 queries paralele de count + fetch al tuturor bookings/properties
- **Fișier**: `src/components/admin/AdminDashboard.tsx` (liniile 82–168).
- 10 `select("*", { count: "exact", head: true })` + `bookings.select("*")` fără limit (poate ajunge la 10.000 rânduri) + `properties.select("id, name")`. Rulează la fiecare montare a tab-ului dashboard.
- Aceleași count-uri sunt dublate în `AdminUnifiedKpiBar.tsx` și în `Admin.tsx` (linia 70–98).
- **Fix**: creează RPC `admin_dashboard_snapshot()` care returnează toate cifrele într-un singur roundtrip; sharează prin `useQuery` cu `queryKey: ["admin-dashboard-snapshot"]`.

### 11. Toast providers amestecate (`sonner` vs `@/hooks/use-toast`)
- 41 fișiere folosesc `sonner`, 73 folosesc `@/hooks/use-toast` — două biblioteci de toast, două containere, două stiluri, două comportamente de dismiss.
- **Impact**: notificări inconsistente (design, poziție, durată). Cazuri unde ambele afișează aceeași eroare (dublate).
- **Fix**: alege unul (recomandat `sonner` — mai modern, mai simplu). Codemod global și scoate provider-ul învechit din `App.tsx`.

### 12. `console.log`/`console.error` în path-uri de producție
- **Fișiere**: `LeadsManager.tsx` linia 310 (`console.log('New lead received:', payload)`), `useAdminRole.ts` liniile 32–49, `ProspectManager.tsx` linia 362, `BlogManager.tsx` linia 341, `AdminDashboard.tsx` linia 161. Total 9 log-uri în admin + noise din hooks.
- **Impact**: log-uri de PII (nume lead, telefon) în consolă browser + zgomot pentru monitoring.
- **Fix**: înlocuiește cu `errorReporting.captureException` (există deja `src/lib/errorReporting.ts`) sau șterge.

### 13. Realtime channels — potențiale probleme
- **Fișier**: `src/components/admin/LeadsManager.tsx` linia 300–350: cleanup-ul `removeChannel(channel)` există dar `useEffect` are ca dep `[language, showToast]`. `showToast` este stabil, `language` schimbat re-abonează → un scurt window fără subscription, plus `playNotificationSound` se apelează la fiecare INSERT chiar dacă tab-ul nu e vizibil.
- `BlogLiveActivity.tsx` folosește `.on("postgres_changes", …, (p: any) => …)` cu `setItems((prev) => [item, ...prev].slice(0, MAX))` — nu deduplică pe re-subscribe, dacă serverul retrimite același eveniment după reconnect apare duplicat vizual.
- **Fix**: `document.visibilityState === "visible"` guard pe sunet, dedupe pe `id` la insert în listă, dep-array minim (`[]` cu ref pentru handler-ele care se schimbă).

### 14. `AutomationManager` — logica de dedupe recalcă în client la fiecare mount
- **Fișier**: `src/components/admin/AutomationManager.tsx` linia 181–233 (`loadQueueStatus`).
- Se trag toate prospect-urile eligibile + toate `voice_call_sessions` din ultimele 7 zile → în client se face `Set<phone>` + `Map<phone, firstCall>`. Pentru cont mare (mii de call-uri/săptămână) crește păgubos.
- **Fix**: mută în RPC `voice_agent_queue_status()` cu agregare Postgres; client cere doar cifrele.

### 15. Zero componente comune reutilizate pentru pattern-uri repetate
- 20 de manageri au propriul lor `Card + CardHeader "Title" + description + search input + filter select + table` scris de mână.
- 21 de manageri implementează export CSV cu `Blob([csv], { type: 'text/csv' })` de la zero.
- **Fix**: creează `src/components/admin/_shared/`:
  - `AdminPageShell` (title, description, actions slot, spacing consistent)
  - `AdminDataTable<T>` (props: columns, rows, isLoading, empty, onExportCsv, virtualization automată peste 200 rânduri)
  - `AdminSearchAndFilters` (search input + slot filter chips)
  - `useCsvExport(rows, columns, filename)`
  - `useAdminList<T>(queryKey, queryFn, opts)` — wrapper `useQuery` cu isLoading/error/empty state uniform.
- Reduce estimat 8.000–12.000 linii duplicate.

### 16. Empty states inconsistente sau absente
- 25 de fișiere au `.map()` pe rânduri fără branch pentru `length === 0` (grep în audit). Uneori se vede un `<Table>` gol fără mesaj.
- **Fixuri**: componentă `<AdminEmptyState icon title description action />` folosită uniform; adăugată la toate listele. `AutoPublishLogsDashboard.tsx` (linia 128) este exemplul bun de urmat.

### 17. Manageri prea mari — refactor în sub-componente
- 12 fișiere peste 1000 linii, dintre care `SEOPremiumTabs.tsx` (2072), `AutomationManager.tsx` (1896), `POIManager.tsx` (1791), `PropertyManager.tsx` (1528), `SEOOptimizerManager.tsx` (1493), `ProspectManager.tsx` (1484), `BlogManager.tsx` (1348), `VoiceAgentManager.tsx` (1278), `VoiceAgentBatchCalling.tsx` (1249), `PropertyImageGallery.tsx` (1248), `SeoGuideGenerator.tsx` (1197).
- **Impact**: greu de reviewed, greu de test, imposibil de tree-shake, cauza principală a duplicării.
- **Fix**: split pe secțiuni (`BlogManager/ArticleTable.tsx`, `BlogManager/ArticleDialog.tsx`, `BlogManager/BulkBar.tsx`, ...). Chunk-urile lazy rămân aceleași; doar structura internă.

### 18. `BlogManager.handleBulkSave` fake
- **Fișier**: `src/components/admin/BlogManager.tsx` linia 149–152. Buton „Salvare bulk" afișează doar un toast informativ; nu salvează nimic. UX înșelător.
- **Fix**: fie implementează bulk update (ex. `is_published` toggle pe selecție), fie ascunde butonul până e implementat.

### 19. Sidebar cu 45+ tab-uri — descoperire slabă
- **Fișier**: `src/components/admin/adminNavConfig.tsx` (linia 34–122). 45 de item-uri distribuite în 5 grupuri, unele cu 15+ intrări (Marketing).
- Deja există Command Palette (`Cmd+K`), dar nu există pin-uri vizibile de default pentru fluxuri comune, nu există „recomandat pentru tine" bazat pe recente.
- **Fix**: default pin pentru top 5 tab-uri folosite (leads, dashboard, blog, properties, prospects), badge "Nou" pentru cele adăugate în ultima săptămână (ai deja `useAdminRecentTabs`).

---

## 🟡 NICE-TO-HAVE — polish și consistență

### 20. Tipografie inconsistentă (titluri)
- 128 folosiri de `text-2xl font-bold`, 30 de `text-3xl font-bold`, 35 de `font-serif` — fără regulă clară cine folosește ce.
- **Fix**: un token `<AdminPageTitle>` cu `text-2xl font-serif` (default brand) și `<AdminSectionTitle>` cu `text-lg font-semibold`. Aplică prin `AdminPageShell` (vezi #15).

### 21. Spacing inconsistent
- 143 rădăcini cu `space-y-4`, 72 cu `space-y-6`, 0 cu `space-y-8`. Ochiul percepe diferență de padding între tab-uri.
- **Fix**: standard `space-y-6` la root de pagină, `space-y-4` în interiorul cardurilor.

### 22. Loader duplicate
- Fiecare manager renderează propriul `<Loader2 className="animate-spin" />` cu paddings diferite. Deja există `AdminTabFallback.tsx` — dar nu e reutilizat în interiorul tab-urilor.
- **Fix**: componentă `<AdminLoadingState />` unică, cu variantă `card`, `table`, `inline`.

### 23. `BlogSEOAnalyticsPanel` — hardcodat CPC = 0.45 €
- **Fișier**: `src/components/admin/blog/BlogSEOAnalyticsPanel.tsx` linia 12 (`const CPC_EUR = 0.45`).
- Valoarea nu e configurabilă din UI; pentru un panou premium ROI ar merita input în admin (`site_settings.blog_cpc_eur`) sau slider inline.

### 24. `BlogLiveActivity` limitat la 50 items fără paginare
- **Fișier**: `blog/BlogLiveActivity.tsx` linia 18 (`MAX = 50`). Pentru un feed „live" e OK, dar nu are „vezi mai vechi" → istoricul complet e greu de accesat.
- **Fix**: buton „Vezi tot istoricul" care deschide un drawer cu paginare.

### 25. `AutoPublishLogsDashboard` limit 200
- **Fișier**: `src/components/admin/AutoPublishLogsDashboard.tsx` linia 40. Suficient pentru scop, dar când numărul de rulări crește nu se poate răsfoi mai departe.
- **Fix**: paginare `.range(...)` cu buton „Încarcă mai multe".

### 26. `useAdminRole` — retry doar o dată, mesaj tehnic în UI
- **Fișier**: `src/hooks/useAdminRole.ts` linia 66–72. Mesajul „Verificare admin eșuată — verifică conexiunea" ajunge în UI (`Admin.tsx` linia 183) doar dacă `isAdmin === false`, deci utilizatorul vede „Not Admin" în loc de mesajul real.
- **Fix**: propagează `error` la UI și afișează un card retry dedicat când `error != null`.

### 27. Absență a `<main>` explicit — SEOHead cu `noIndex` OK, dar tag structural lipsă
- **Fișier**: `src/pages/Admin.tsx` linia 264 folosește `<main>` — OK, singular. ✅ (Rămâne notat că nici un manager nu adaugă al doilea `<main>`, dar merită check periodic.)

### 28. `outreach/OutreachTemplatesPanelB2C.tsx` și `outreach/OutreachQuickAction.tsx` — folder izolat
- Nu apare în `adminTabLoaders.ts`. Fie sunt sub-componente pentru un tab existent (ok), fie sunt cod mort.
- **Fix**: verifică unde sunt importate; dacă nu, șterge.

### 29. Focus management în dialoguri
- Multe `<Dialog>` (BlogManager, PropertyManager) au primul input `autoFocus`, dar când se închide, focus-ul se pierde uneori pe body (nu se întoarce la butonul care a deschis). Radix o face bine dacă `<DialogTrigger>` e folosit; unele deschideri sunt controlate manual (`setIsDialogOpen(true)` din buton fără trigger).
- **Fix**: folosește `<DialogTrigger asChild>` sau setează `initialFocusRef` explicit.

### 30. Contrast pe badge-uri hardcoded (`text-amber-500 border-amber-500/20`)
- **Fișiere**: `BlogManager.tsx` liniile 864–870, `AutoPublishLogsDashboard.tsx`, `blog/BlogRollbackButton.tsx`. Culori Tailwind directe (`text-amber-500`, `text-green-500`), nu tokens semantici.
- **Impact**: nu respectă dark theme corect; contrast nesigur.
- **Fix**: creează variante shadcn `<Badge variant="warning|success|danger">` peste tokens semantici (`--warning`, `--success`, `--destructive`) și adoptă global.

---

## Recomandare de execuție (dacă vrei să implementez ulterior)

**Sprint 1 (safety net)** — 1–2 zile
- #1 MFA server-side
- #4 shortcut Cmd+R
- #5 ErrorBoundary local
- #12 curățare `console.log`

**Sprint 2 (a11y + performanță vizibilă)** — 2–3 zile
- #2 aria-labels
- #3 N+1 rollback
- #10 dashboard snapshot RPC
- #14 automation queue RPC

**Sprint 3 (design system admin)** — 3–5 zile
- #15 componente comune (`AdminPageShell`, `AdminDataTable`, `useCsvExport`, `useAdminList`)
- #16 empty states uniforme
- #22 loader unic
- #30 badge variants

**Sprint 4 (payoff pe tot codul)** — 5–8 zile
- #7 virtualizare pe listele mari
- #6 restricționare `select("*")`
- #9 migrare la `react-query`
- #11 unificare toast
- #17 split fișiere >1000 linii

Nu pornesc nimic până nu confirmi ce vrei să prioritizezi.
