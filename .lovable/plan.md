# Plan automatizare Admin RealTrust — Faza 1

Scop: să transformăm Admin-ul dintr-un panou operat manual într-un sistem care lucrează singur pe acțiunile sigure și escaladează doar ce contează spre tine. Două zone în Faza 1: **Lead Pipeline (Scraper + Voice Agent)** și **SEO & Indexare automată**. Risk: echilibrat (auto pe sigur, aprobare pe destructiv). Canale: WhatsApp urgențe, Email digest, In-app pentru tot.

## Principii care guvernează tot

1. **Audit log obligatoriu** — orice acțiune autonomă scrie în `admin_audit_log` (cine/ce/când/de ce + payload reversibil).
2. **Kill switch global** — un singur toggle în Admin → Automation (`automation_enabled`) oprește toate joburile fără deploy.
3. **Reversibil** — fiecare acțiune are buton "Revert" 1-click în UI (ex: un-blacklist, un-archive, re-publish).
4. **Quotas + circuit breaker** — dacă o automatizare eșuează 3x consecutiv, se auto-dezactivează și te alertează.
5. **Idempotență** — toate joburile pot rula de 2x fără efecte duble (folosim chei `dedupe_key`).

---

## Zona 1 — Lead Pipeline (Scraper + Voice Agent)

### A. Auto pe acțiuni sigure (fără aprobare)

| Acțiune | Trigger | Ce face |
|---|---|---|
| **Auto-tag agency suspicion score** | La fiecare insert în `prospect_listings` | Gemini 2.5 Flash analizează titlu+descriere+telefon → scor 0-100, salvat în `agency_suspicion_score`. Sub 70 = sigur owner. |
| **Auto-dedup cross-platform** | Insert prospect | Hash `phone_normalized + zone_key + rooms + size_bucket` → skip dacă există în ultimele 30 zile (deja există parțial; îl extindem pe toate cele 3 surse). |
| **Auto Twilio Lookup** | Insert cu telefon nou | Verifică line_type → dacă landline/voip, marchează `do_not_call=true` automat. |
| **Auto-archive caller profiles** | Cron zilnic 03:00 | Profilurile fără apel de 6+ luni → arhivat (deja există funcția `voice_caller_archive_stale`, o rulăm cu cron). |
| **Auto-recall după no-answer** | Apel finalizat cu `status='no_answer'` | Reprogramare automată după 4h, max 2 retries; al 3-lea no-answer → marchează `cold` și oprește. |
| **Auto-injectare în voice queue** | Lead score ≥ 80 și `lifecycle_status='new'` | Deja există trigger-ul; îl extindem cu **rate limiting** (max 5 apeluri auto/oră) ca să nu suprasolicităm. |

### B. Aprobare necesară (semi-auto)

| Acțiune | Cum funcționează |
|---|---|
| **Auto-blacklist agency** | Scor suspicion ≥ 85 → propunere în "Pending Approvals" tab cu evidence (3 listings, telefon, domain). 1 click "Approve" execută `auto_blacklist_prospect`. |
| **Recall lead 90+** | Lead 90+ care n-a răspuns la primul auto-call → notificare WhatsApp către admin cu opțiunea "Sun-l manual" (deep link `tel:`). |
| **Bulk archive agency** | Buton existent `bulk_archive_detected_agencies` → adăugăm preview "Vei arhiva X listinguri" + audit. |

### C. Notificări & escaladare

- **WhatsApp imediat** (folosim `notify-new-lead-whatsapp` existent):
  - Lead score ≥ 90 nou
  - Auto-call eșuat 3x pe lead 90+
  - Circuit breaker activat (ceva s-a oprit singur)
- **In-app** (`user_notifications`):
  - Pending approvals (auto-blacklist propus)
  - Anomalii (drop > 30% lead-uri zilnic vs media săptămânală)
- **Email digest zilnic 08:00**:
  - Top 10 leaduri noi 80+, conversii ieri, apeluri reușite/eșuate, cost Twilio estimat, anomalii detectate

### D. Self-healing (cron monitor)

- Job eșuat 1x → retry exponențial (1min, 5min, 15min)
- Job eșuat 3x consecutiv → auto-disable + WhatsApp + In-app
- Recovery automat: când job-ul rulează cu succes după disable, se re-activează singur și logheaz "self-recovered"

---

## Zona 2 — SEO & Indexare automată

### A. Auto pe acțiuni sigure

| Acțiune | Trigger | Ce face |
|---|---|---|
| **Auto-audit URL la modificare** | Update pe `properties`, `blog_articles`, `complex_landing_pages` | Edge function `seo-auto-audit` rulează Gemini pe noul conținut → salvează scor + sugestii în `seo_audit_cache`. |
| **Auto-push IndexNow** | Insert/update pe content tables | Trigger DB → edge function `indexnow-push` (există deja) cu URL nou/modificat. |
| **Auto-fill meta lipsă** | Cron 04:00 zilnic | Detectează properties fără `meta_title` sau `meta_description` → Gemini generează draft → **status='pending_review'** (NU publică). Tu aprobi din Admin → SEO. |
| **Auto-detect canonical conflicts** | Cron săptămânal duminică | Crawl sitemap, verifică că fiecare URL are canonical curat, fără slash, fără query. Raportează conflictele. |
| **Auto-refresh pe drop SEO** | Cron zilnic | Compară `semrush seo_trend` ultimele 7 zile → dacă scădere > 15%, generează raport "Pages with biggest position drops". |

### B. Aprobare necesară

| Acțiune | Cum |
|---|---|
| **Apply meta suggestions** | Lista de propuneri Gemini cu "Approve all" / "Approve individual" / "Reject" |
| **Republish improved page** | Când AI rescrie un title/meta, trebuie aprobat înainte să-l salvezi în DB |

### C. Notificări

- **In-app**: meta lipsă detectată, audit URL gata, SEO drop > 15%
- **Email săptămânal luni 09:00**: Raport SEO complet (poziții, top pagini, recomandări AI, ce-am auto-fixat)

---

## Detalii tehnice (pentru memoria proiectului)

### Schema nouă

```sql
-- Centralizator pentru toate automatizările
CREATE TABLE automation_jobs (
  id uuid PRIMARY KEY,
  job_key text UNIQUE,            -- 'lead.auto_dedup', 'seo.auto_audit', etc.
  enabled boolean DEFAULT true,
  schedule text,                   -- cron expression sau 'event-driven'
  last_run_at timestamptz,
  last_status text,                -- success | failed | disabled
  consecutive_failures int DEFAULT 0,
  config jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Acțiuni propuse care așteaptă aprobare
CREATE TABLE automation_approvals (
  id uuid PRIMARY KEY,
  job_key text,
  action_type text,                -- 'blacklist_agency', 'apply_meta', etc.
  entity_type text,
  entity_id text,
  proposal jsonb,                  -- ce vrea să facă
  evidence jsonb,                  -- de ce propune
  status text DEFAULT 'pending',   -- pending | approved | rejected | expired
  approved_by uuid,
  approved_at timestamptz,
  expires_at timestamptz,          -- auto-expire după 7 zile
  created_at timestamptz DEFAULT now()
);

-- Anomalies detectate (pt dashboard)
CREATE TABLE automation_anomalies (
  id uuid PRIMARY KEY,
  metric text,                     -- 'leads_per_day', 'seo_position_avg', etc.
  baseline numeric,
  observed numeric,
  delta_pct numeric,
  severity text,                   -- info | warning | critical
  context jsonb,
  notified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

### Edge functions noi

```text
supabase/functions/
├── automation-orchestrator/      # rulează la 5 min, dispatch job-uri due
├── lead-auto-classify-agency/    # Gemini pentru suspicion score
├── lead-auto-dedup/              # extinde dedup-ul existent
├── lead-auto-recall/             # programare retry-uri
├── seo-auto-audit/               # audit URL după modificări
├── seo-auto-fill-meta/           # generare meta cu Gemini → pending
├── seo-anomaly-detector/         # compară Semrush week-over-week
└── automation-daily-digest/      # email + WhatsApp digest 08:00
```

### Cron jobs (pg_cron)

```text
*/5 * * * *   automation-orchestrator    (dispatcher principal)
0 3 * * *     voice-caller-archive       (deja existent, doar îl confirmăm activ)
0 4 * * *     seo-auto-fill-meta         (scan + draft)
0 8 * * *     automation-daily-digest    (email + WA)
0 9 * * 1     seo-weekly-report          (luni dimineață)
0 0 * * 0     canonical-conflict-scan    (duminică noapte)
```

### UI nou în Admin

```text
/admin/automation/
├── /                  → Dashboard: status fiecare job, anomalies, kill switch global
├── /pending-approvals → coadă de propuneri (auto-blacklist, meta-apply)
├── /audit-log         → ultimele 200 acțiuni auto + filtre
└── /settings          → config per-job (intervale, praguri, on/off granular)
```

### Securitate & RLS

- Toate tabelele `automation_*` → RLS doar pentru `admin` role
- Funcțiile RPC noi → `SECURITY DEFINER` cu `has_role(auth.uid(), 'admin')` check
- Edge functions de orchestrator → secret `x-automation-secret` validation

---

## Plan de execuție în iterații

| Iter | Conținut | Risc |
|---|---|---|
| **1** | Schema (`automation_jobs`, `automation_approvals`, `automation_anomalies`) + UI shell `/admin/automation` cu kill switch | Mic — doar tabele noi + UI read-only |
| **2** | Lead: auto-dedup extins + auto-classify agency + Twilio lookup. Audit log activ. | Mediu — modifică flow-ul de scrap |
| **3** | Lead: auto-recall + pending approvals UI + WhatsApp escalation | Mediu |
| **4** | SEO: auto-audit pe modificări + auto-push IndexNow + auto-fill meta (draft, NU live) | Mic |
| **5** | Daily digest (email + WhatsApp) + Anomaly detector + Self-healing cron monitor | Mic |
| **6** | SEO weekly report cu Semrush + canonical conflict scan | Mic |

Fiecare iterație îți cere "Continui?" la final. Poți opri oricând.

---

## Ce NU automatizez în Faza 1

- Auto-publish properties (rămâne aprobare manuală)
- Auto-reply chatbot către lead (doar sugerare draft)
- Auto-modificare prețuri sau ROI (doar recalcul matematic)
- Acțiuni pe `auth.users`, `profiles`, `payments` (zero risc accept)

---

## Cost & resurse estimate

- **Gemini API**: ~30K tokens/zi pentru clasificări + audits → în quota gratis
- **Twilio Lookup**: ~$0.005/lead nou → ~$5/lună la volum actual
- **Email digest**: 1/zi via Lovable Emails → gratis în quota
- **DB storage**: tabelele noi ~5MB/lună
- **Edge functions**: ~10K invocations/lună → în quota

---

## Următorul pas

Aprobi planul → încep cu **Iterația 1** (schema + UI shell + kill switch). E iterația cu cel mai mic risc și îți dă imediat un loc unde să vezi și să oprești totul. După confirmare, îți dau preview UI înainte să continui cu Iterația 2.

Dacă vrei modificări la plan (schimbare priorități, adaugare/eliminare automatizări, alt risk profile pe o zonă specifică), spune acum.