
# Sprint 1 Admin — Critic

Înainte să încep, câteva **clarificări de scope** — fișierele din planul original au altă denumire în cod. Vreau confirmare că mapping-ul de mai jos e ok, apoi execut.

## 0. Mapping fișiere (nume real în proiect)

| Plan | Fișier real |
|---|---|
| UsersManager | nu există `UsersManager.tsx` — cel mai apropiat e `src/components/admin/UsersRolesManager.tsx` (dacă există) sau tab-ul din `AdminDashboard`. **Trebuie să confirm ce înțelegi prin "UsersManager"** — profiles? user_roles? auth users list? |
| LeadsManager | `src/components/admin/LeadsManager.tsx` ✅ |
| ScraperLeadsManager | nu există sub acest nume — există `ScraperMonitorPanel`, `ScraperAnalytics`, `ScraperLeadActions`, `ScraperBulkActions`. Presupun **`ScraperMonitorPanel.tsx`** = tabela principală prospect_listings/scraper_leads_archive. |
| PropertiesManager | fișierul real este **`PropertyManager.tsx`**. |
| AutomationRunsHistory | nu există fișier cu acest nume — presupun tab-ul din `AutomationManager.tsx` care listează `automation_runs`. |
| SEOAuditLogViewer | fișierul real este **`AuditLogViewer.tsx`** (listează `seo_audit_log` / `admin_audit_log`). |
| CommunicationLogsPanel | nu găsesc fișier cu acest nume — presupun tab în `LeadsManager` sau componentă separată. Trebuie confirmare. |
| VoiceAgentLiveMonitor | fișierul real este **`VoiceAgentMonitoring.tsx`** (are stream realtime). |
| BlogLiveActivity | `src/components/admin/blog/BlogLiveActivity.tsx` ✅ |
| AutomationLiveLogs | `src/components/admin/AutomationLiveLogs.tsx` ✅ |

**Dacă mapping-ul e ok, spune "ok" și pornesc.** Dacă vrei alt fișier pentru UsersManager / ScraperLeadsManager / CommunicationLogsPanel, spune-mi care.

---

## 1. C3 — Mascare PII + audit log

### Migrare Supabase
Tabela `admin_access_logs` **deja există** (8 coloane, 3 policies — văd în context). Verific schema și dacă lipsesc coloane (`revealed_field`, `entity_type`, `entity_id`) fac un `ALTER TABLE` aditiv. Altfel refolosesc.

Adaug (dacă lipsește):
- RPC `log_pii_reveal(entity_type text, entity_id text, revealed_field text)` — `SECURITY DEFINER`, verifică `has_role(auth.uid(),'admin')`, insert în `admin_access_logs`.

### Utilitare frontend
- `src/utils/security/maskPII.ts` — `maskPhone`, `maskEmail`, `maskIP`.
- `src/components/admin/shared/RevealableField.tsx` — afișează mascat + buton eye/eye-off; la click apelează RPC-ul de audit și dezvăluie valoarea. Timeout 30s → re-mascare automată.

### Integrare
- **LeadsManager**: telefon, email, IP (dacă e afișat).
- **ScraperMonitorPanel**: telefon vânzător.
- **UsersManager / profiles list**: email, telefon.

## 2. C4 — Hardening RPC-uri distructive

Audit + patch la fiecare funcție SECURITY DEFINER apelată din UI admin pentru delete/rollback/kill. Fiecare va avea la început:

```sql
IF NOT public.has_role(auth.uid(), 'admin') THEN
  RAISE EXCEPTION 'admin role required' USING ERRCODE = '42501';
END IF;
```

Scanez și acopăr minim:
- `blog_rollback_ai_snapshot`
- `revoke_admin_mfa` (deja are — verific)
- funcții de delete pe leads/properties/prospect_listings apelate din UI
- kill-switch automation (dacă există RPC)

Pentru edge functions distructive: verific că fiecare handler pornește cu `requireAdmin(req, corsHeaders)` (majoritatea au fost setate deja în sprint-ul de securitate — completez ce lipsește).

## 3. C1 — Paginare + select explicit

Pattern unificat printr-un hook nou `src/hooks/admin/usePaginatedQuery.ts` (React Query wrapper cu `.range()` + `count: 'exact'`, page size 25/50/100, prefetch next page).

Componentă `src/components/admin/shared/AdminPagination.tsx` (prev/next + jump + page size selector).

Aplicat pe: **LeadsManager, PropertyManager, ScraperMonitorPanel, AutomationManager (runs tab), BlogManager, AuditLogViewer, CommunicationLogsPanel** (dacă îl identificăm).

Toate `.select('*')` înlocuite cu listă explicită de coloane necesare view-ului.

## 4. C2 — Cleanup realtime channels

Pattern standard într-un hook nou `src/hooks/admin/useRealtimeChannel.ts`:
- key stabil `` `admin-${name}-${uid}` ``
- `removeChannel` în cleanup
- dedupe pe re-render (ref pentru instanța activă)
- reconnect controlat (nu recreează pe fiecare state change)

Refactor: `BlogLiveActivity`, `AutomationLiveLogs`, `VoiceAgentMonitoring`, `ScraperMonitorPanel`.

## 5. C5 — Split fișiere atinse

Doar pentru cele modificate mai sus:
- **BlogManager** (~1400 linii) → `blog/hooks/useBlogArticles.ts`, `blog/columns.tsx`, `blog/dialogs/BlogEditDialog.tsx`, `blog/BlogFilters.tsx`.
- **PropertyManager** → `property/hooks/useProperties.ts`, `property/columns.tsx`, `property/dialogs/*`.
- **ScraperMonitorPanel** → `scraper/hooks/useProspectListings.ts`, `scraper/columns.tsx`.

Split-ul e **doar de extragere** (fără schimbări logice) — 1:1 cod mutat + import-uri actualizate.

## 6. Verificare finală
- `tsgo` typecheck complet (nu build/deploy).
- Fără modificări pe restul componentelor admin.

---

## Livrări

- 1 migrare Supabase (RPC nou + eventual ALTER pe admin_access_logs + hardening RPC-uri existente).
- ~4 fișiere shared noi (`RevealableField`, `AdminPagination`, `usePaginatedQuery`, `useRealtimeChannel`, `maskPII`).
- Edit pe 7 manageri + 3 componente realtime.
- Split în 3 directoare noi (`blog/`, `property/`, `scraper/`).

## Aștept

Confirmă:
1. **Mapping-ul de fișiere** (mai ales UsersManager, ScraperLeadsManager, CommunicationLogsPanel).
2. **Timeout reveal 30s** ok, sau alt interval?
3. **Page size default** — 25, 50, sau 100?

După "ok" pornesc cu migrarea (o singură cerere de aprobare) și apoi codul.
