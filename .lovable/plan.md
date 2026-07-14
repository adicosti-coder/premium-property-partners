
# Plan implementare — Blog Premium (3 module)

Bazat pe scanul structurii existente (`BlogManager.tsx`, `BlogArticle.tsx`, `blogCategories.ts`, tabele `blog_articles`, `seo_audits`, `seo_ga4_metrics`, `seo_override_history`, `automation_approvals`, `indexnow_pings`, edge functions existente `seo-auto-fill-meta`, `indexnow-notify`, `openrouter-glm`), voi refolosi patternurile deja stabilite (aprobări în `automation_approvals`, istoric în `seo_override_history`, realtime prin `supabase.channel`).

---

## MODUL 1 — Blog AI Auto-Pilot + Rollback

### Migrare Supabase
Tabel nou `blog_ai_snapshots`:
- `id`, `article_id` (FK → `blog_articles`), `created_at`, `triggered_by` ("auto"|"manual"|"ai_pilot")
- `previous_state` JSONB (title, meta_description, content_en, image_alts JSONB)
- `applied_changes` JSONB (câmpurile modificate + noile valori)
- `confidence_score` numeric(5,2), `ai_model` text, `rationale` text
- `rolled_back_at` timestamptz, `rolled_back_by` uuid
- RLS: admin-only + `service_role`. GRANT-uri per convenție.

Extindere `blog_articles` (dacă lipsesc):
- `ai_last_optimized_at`, `ai_confidence_score`, `ai_pending_review` bool

### Edge function `blog-ai-autopilot`
- Selectează articolele cu `updated_at` vechi sau fără audit recent (batch 5).
- Pentru fiecare: apel Gemini prin gateway → returnează JSON `{title, meta_description, alt_texts[], content_en, confidence:0-1, rationale}`.
- Dacă `confidence ≥ 0.85`: salvează snapshot cu `previous_state`, aplică update pe `blog_articles`, marchează `ai_last_optimized_at`. Trimite IndexNow ping.
- Dacă `< 0.85`: inserează în `automation_approvals` cu `job_key='blog.ai_autopilot'`.
- Log în `auto_publish_logs` (refolosit).
- Cron pg_cron 1×/zi 03:00 Europa/București.

### RPC `blog_rollback_ai_snapshot(snapshot_id)`
- SECURITY DEFINER, verifică `has_role(auth.uid(),'admin')`.
- Restaurează câmpurile din `previous_state`, setează `rolled_back_at`.

### UI în BlogManager
- Buton "Anulează modificarea AI" per articol dacă are snapshot activ neanulat (badge cu confidence % + tooltip cu rationale).
- Dialog confirmare + toast succes.

---

## MODUL 2 — Command Center UI & Live Activity

### Layout BlogManager (2 coloane)
- Stânga: listă articole cu checkbox select multiple, filtre, search.
- Dreapta: panel editor + live activity feed.
- Sticky bar jos: "X selectate | Salvează bulk (⌘A) | Re-audit SEO (⌘R) | Publică | Anulează".

### Scurtături globale
Hook `useBlogAdminShortcuts`: `Cmd/Ctrl+A` → bulk save selecție, `Cmd/Ctrl+R` → invocă `seo-audit` pe fiecare selectat (previne comportamentul default browserului doar în interiorul paginii admin).

### Live Activity Feed
Componentă `BlogLiveActivity`:
- Realtime pe `auto_publish_logs`, `indexnow_pings`, `blog_ai_snapshots`.
- Feed cronologic cu icon + culoare + timestamp relativ, max 50 evenimente în memorie.
- Indicator LIVE cu puls verde când canalul e conectat.

---

## MODUL 3 — Analytics & ROI SEO

### Componentă `BlogSEOAnalyticsPanel` (în admin blog)
- Toggle 7/30/90 zile.
- Chart evoluție scor mediu SEO (din `seo_audits` filtrat pe URL-uri `/blog/*`) + trafic organic (din `seo_gsc_daily` sau `seo_ga4_metrics` pentru path-uri `/blog/`).
- Recharts LineChart cu 2 axe Y.

### ROI Card premium glassmorphic
- Formula: `ROI = clicks_organice × 0.45 EUR`.
- Card cu `bg-gradient` + `backdrop-blur` + border auriu `#D4AF37`, tipografie mare pentru KPI, sub-KPI: clicks, CPC estimat, comparație vs perioada precedentă (delta %).
- Fără hardcodări de culori — folosesc tokens semantici deja existente + accent-gold.

---

## Fișiere afectate

**Create:**
- `supabase/migrations/<ts>_blog_ai_snapshots.sql` (tabel + RLS + GRANT + RPC rollback + coloane blog_articles)
- `supabase/functions/blog-ai-autopilot/index.ts`
- `src/components/admin/blog/BlogLiveActivity.tsx`
- `src/components/admin/blog/BlogSEOAnalyticsPanel.tsx`
- `src/components/admin/blog/BlogRollbackButton.tsx`
- `src/hooks/useBlogAdminShortcuts.ts`

**Modificate:**
- `src/components/admin/BlogManager.tsx` (layout 2 coloane + sticky bar + integrare componente noi)
- `src/integrations/supabase/types.ts` (regen după migrare)

**Cron:** inserat prin `supabase--insert` după deploy (conține anon key + URL specifice).

---

## Ordinea execuției
1. Migrare (necesită aprobarea ta separată).
2. Edge function + regen types.
3. Componente UI + hook.
4. Refactor BlogManager.
5. Cron pg_cron.
6. Verificare typecheck.

**Nu se face deploy/publish** — aștept confirmarea ta după implementare.

Confirmi planul? Sau vrei ajustări (ex.: prag confidence, interval cron, formula ROI, split în mai puține fișiere)?
