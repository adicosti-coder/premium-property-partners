# Automatizare completă GSC + Scraping + SEO

Scop: transformăm widget-ul GSC într-un sistem autonom care zilnic colectează date din Search Console, le încrucișează cu scraping (Firecrawl) și AI (Gemini), generează acțiuni recomandate și trimite alerte. Totul rulează automat prin cron, fără intervenție manuală.

## Arhitectura

```text
[Cron zilnic 06:00] ─┬─► gsc-daily-snapshot ──► tabel seo_gsc_daily (per query+page)
                     ├─► seo-page-audit-cron ──► Firecrawl scrape top pagini ──► tabel seo_page_audits
                     ├─► seo-opportunity-detector ──► Gemini ──► tabel seo_opportunities
                     └─► seo-anomaly-alerts ──► Resend email + admin notification

[Widget Admin] ──► citește toate tabelele ──► dashboard unificat cu 5 tab-uri
```

## Ce automatizăm

### 1. Snapshot zilnic GSC (`gsc-daily-snapshot`)
- Cron 06:00 fiecare zi
- Salvează clicks/impressions/CTR/poziție pentru fiecare (query, page, date) în `seo_gsc_daily`
- Permite trend analysis pe orizont lung (90+ zile) fără re-fetch GSC
- Calculează delta vs ziua precedentă, săptămâna precedentă

### 2. Detector oportunități SEO (`seo-opportunity-detector`)
Identifică automat 4 tipuri de oportunități:
- **Striking distance**: query-uri pe poziția 4-15 cu impressions mari → push pentru top 3
- **CTR underperformers**: poziție bună (1-5) dar CTR sub media SERP → optimizare title/meta
- **Decay**: pagini cu trend descendent >20% în 7 zile → alertă urgentă
- **Cannibalization**: 2+ pagini ranking pentru același query → recomandare consolidare
- Fiecare oportunitate primește scor de impact (clicks potențiale câștigate)

### 3. Audit on-page automat (`seo-page-audit-cron`)
- Pentru top 20 pagini din GSC + pagini cu oportunități
- Firecrawl scrape (markdown + html + metadata) o dată pe săptămână
- Extrage: title, meta description, H1, H2, word count, schema JSON-LD, internal links, alt-text missing
- Stochează în `seo_page_audits` cu issue flags: title prea lung/scurt, meta lipsă, H1 duplicat, etc.

### 4. AI Action Plan (Gemini)
- Pentru fiecare oportunitate top 10, Gemini generează:
  - Sugestie title nou (cu keyword target)
  - Sugestie meta description
  - 3 acțiuni concrete (ex: "adaugă secțiune FAQ despre X", "internal link de la /pagina-y")
- Cache rezultate 7 zile (mem://technical/ai-quota-caching-strategy)

### 5. Competitor SERP tracking (extindere `seo-competitor-snapshot`)
- Pentru top 20 query-uri proprii: SERP scrape săptămânal cu Firecrawl
- Track poziție vs 3 competitori principali
- Alertă când un competitor depășește RealTrust pentru query important

### 6. Alerte automate
- **Email săptămânal** (extindere `seo-weekly-report`): include top oportunități + audit issues + competitor moves
- **Alertă instant** (Resend + admin notification): drop >30% clicks pe pagină importantă, deindexare detectată, competitor a urcat pe poziția 1
- **IndexNow** (există deja): re-ping automat când o pagină e modificată

## Schimbări UI — Widget GSC extins în 5 tab-uri

```text
┌─ Performanță Google (Search Console) ─────────────────────┐
│ [Overview] [Oportunități] [Audit] [Competitori] [Istoric] │
├───────────────────────────────────────────────────────────┤
│ Overview: KPI-uri actuale + chart trend (existent)        │
│ Oportunități: tabel cu scor impact + buton "Aplică AI"    │
│ Audit: lista pagini cu issues + CTA "Re-scrape acum"      │
│ Competitori: matrice query × competitor cu poziții        │
│ Istoric: trend 90 zile cu zoom + compară perioade         │
└───────────────────────────────────────────────────────────┘
```

## Detalii tehnice

### Tabele noi (migrații)
- `seo_gsc_daily` — (date, query, page, clicks, impressions, ctr, position) cu PK compus
- `seo_opportunities` — (id, type, query, page, score, suggested_title, suggested_meta, ai_actions jsonb, status, created_at)
- `seo_page_audits` — (page, last_scraped_at, title, meta, h1, word_count, issues jsonb, schema_present)
- `seo_competitor_rankings` — (date, query, our_position, competitor_domain, competitor_position)
- RLS: doar admin (`has_role(auth.uid(), 'admin')`)

### Edge functions noi
- `gsc-daily-snapshot` (cron, verify_jwt false)
- `seo-opportunity-detector` (cron + manual)
- `seo-page-audit-cron` (cron săptămânal)
- `seo-ai-action-plan` (manual din UI per oportunitate)
- `seo-competitor-rank-tracker` (cron săptămânal, Firecrawl SERP)

### Cron schedule (pg_cron)
- 06:00 zilnic → gsc-daily-snapshot
- 06:15 zilnic → seo-opportunity-detector + seo-anomaly-alerts
- Luni 07:00 → seo-page-audit-cron + seo-competitor-rank-tracker + seo-weekly-report (existent)

### Dependențe externe
- **Google Search Console**: connector există (gateway)
- **Firecrawl**: connector există (scrape + SERP search)
- **Lovable AI Gateway** (Gemini 2.5 Flash): pentru opportunity scoring + action plans
- **Resend**: există pentru email

## Ce NU includem
- Backlink monitoring (necesită Semrush API plătit per call)
- Auto-rewrite live al meta tag-urilor (riscant fără review uman) — păstrăm flow "AI suggest → admin approve → apply"
- Rank tracking pentru >20 keywords (cost Firecrawl)

## Ordine implementare
1. Migrații tabele + RLS
2. `gsc-daily-snapshot` + cron + backfill 28 zile
3. `seo-opportunity-detector` + tab UI Oportunități
4. `seo-page-audit-cron` + tab UI Audit
5. `seo-ai-action-plan` (buton per oportunitate)
6. `seo-competitor-rank-tracker` + tab UI Competitori
7. Anomaly alerts + extindere weekly report

## Întrebări înainte de start
1. **Competitori de tracked**: care 3 domenii? (ex: storia.ro, imobiliare.ro, olx.ro?)
2. **Top query-uri prioritare**: vrei să fixez tu lista de ~20 sau le aleg automat din GSC top impressions?
3. **Threshold alertă drop**: 30% scădere clicks pe pagină cheie e ok ca trigger, sau preferi 50%?
