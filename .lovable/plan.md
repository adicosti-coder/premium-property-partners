
## Ce am găsit în cei 6 „manageri Sprint 1"

Structurile lor exterioare diferă mult mai mult decât presupune brief-ul:

| Manager | Structură exterioară |
|---|---|
| **PropertyManager** | Header (icon + titlu + „Add") → 3 KPI cards → search+filtre → tabel |
| **BlogManager** | Header (titlu + 4 butoane acțiuni) → panel analytics opțional → **grid 2 coloane** (tabel + sidebar 360px) |
| **LeadsManager** | **Fără header/titlu** → 5 stats cards → 2 charts → tabel + follow-up sections |
| **ScraperMonitorPanel** | KPI bar custom + tabs interne + tabel + sidebar detalii (1106 linii, layout foarte specific) |
| **AutomationManager** | Tabs (jobs / runs / anomalies / analytics) — 1819 linii |
| **AuditLogViewer** | E un **Dialog**, nu o pagină — are deja layout propriu (DialogHeader + filtre + ScrollArea + AdminPagination) |

**Concluzie onestă:** un `AdminPageShell` cu contract „header + acțiuni + filtre + tabel" **nu se potrivește pe 4 din 6**:
- AuditLogViewer e dialog, nu pagină.
- LeadsManager n-are header și are charts, nu tabel principal.
- BlogManager are layout 2-col cu sidebar.
- ScraperMonitorPanel are KPI-uri custom + sidebar propriu.

Doar **PropertyManager** se mapează curat pe shell-ul propus. Forțarea celorlalți ar însemna fie shell prea slab (doar `<div className="space-y-6">`), fie ruperea layout-urilor existente.

**Aceeași concluzie pentru AdminDataTable:** tabelele au coloane radical diferite (Property = imagini + drag&drop, Blog = translations badges, Scraper = PII masked + realtime highlight, Leads = follow-up inline, Automation Runs = duration + retry badges, Audit = monospace log). Nu există „header sortabil" comun — cele mai multe nu sortează pe client. Nu merită forțat.

## Plan revizuit — 4 livrabile țintite

### 1. `AdminPageShell` — creat, adoptat DOAR unde se potrivește
Fișier: `src/components/admin/shared/AdminPageShell.tsx`

API minim, tot opțional:
```tsx
<AdminPageShell
  icon={Home}
  title="..."
  description="..."        // optional
  actions={<>...</>}       // optional right-side buttons
  stats={<>...</>}         // optional KPI row (children rendered as-is)
  filters={<>...</>}       // optional filter bar
>
  {/* table + pagination */}
</AdminPageShell>
```

**Adopție:**
- ✅ **PropertyManager** — se mapează curat (header + 3 KPI + filtre + tabel).
- ✅ **AutomationManager tab „Runs"** (`AutomationRunsTab.tsx` — creat în Sprint 1) — mic, simplu, se pretează.
- ❌ **BlogManager, LeadsManager, ScraperMonitorPanel, AuditLogViewer** — nu forțez, semnalez în rezumat de ce.

### 2. AdminDataTable — **NU-l fac**
Explic în rezumat de ce structurile sunt prea divergente. Rămânem cu `columns.tsx` per manager (deja extrase în Sprint 1 pentru Scraper/Leads).

### 3. React Query pe query-uri manuale — scope îngust
Verific în paralel:
- `AutomationManager` tabs jobs/anomalies/analytics — dacă folosesc `useState + useEffect + supabase.from()`, le mut pe `useQuery` (fără paginare, doar cache/refetch/loading unificat).
- `AutomationLiveLogs.tsx`, `AutomationAnalytics.tsx`, `CronMonitor.tsx` — verific și migrez doar dacă e fetch manual clar.

Nu ating panouri cu logică subtilă (realtime custom, subscribers manuali) fără să semnalez.

### 4. Toast unificat — pe fișierele atinse
- `@/hooks/use-toast` domină (5/6 manageri din Sprint 1). Standardizez pe **`use-toast`** pentru fișierele pe care le ating în Sprint 2.
- LeadsManager importă și `useToast` și `toast` — dedup la un singur `toast`.
- Nu vânez restul aplicației (85 fișiere sonner + 102 use-toast rămân neatinse).

## La final
- `tsgo` typecheck.
- Rezumat cu diff-ul pe fiecare fișier, ce am refuzat și de ce.
- **Fără deploy** — aștept OK-ul tău.

## Confirmă înainte să pornesc:
- (a) OK cu adopție `AdminPageShell` doar pe 2 fișiere (Property + AutomationRunsTab), sau vrei să-l forțez și pe restul cu un contract mai slab?
- (b) OK să sar AdminDataTable, sau vrei să încerc oricum o abstracție minimă (doar wrapper de loading/empty state)?
