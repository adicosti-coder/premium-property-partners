# Project Architecture Rules

- Keep the homepage hero LCP image sets strictly separated by mobile/desktop media queries so high-DPR phones never fetch desktop assets.
- Start the decorative desktop hero video only after genuine user interaction so the responsive image remains the stable LCP candidate.
- Auto-consented listings view joins prospect/contact data with normalized WhatsApp names and exports filtered rows via shared tested helpers — avoids invented owner data.
- Automatic property publishing prepares a cropped stored cover before activation and derives bedrooms from original source descriptions via a shared deterministic helper — prevents raw portal footers and living rooms counted as bedrooms.
- The Advisor injects mandatory geography from stored property GPS or explicitly approximate district references and versions its cache when geography rules change — prevents stale or invented compass positioning.
- Property offers and Advisor investment cards share `getPropertyInvestmentMetrics`, keeping unrounded annual income until display — prevents inconsistent yields and rental multipliers.
- Property maps and POI travel estimates use `propertyGeo` resolved GPS with explicit district fallback profiles — prevents imported Iosefin listings inheriting city-center coordinates or fixed travel times.
- Chunk-load recovery allows at most one automatic refresh per URL per minute and never refreshes offline or deletes unrelated caches — prevents reload loops and preserves cached resources.
- Keep toast hosts mounted at startup, isolate route errors with a location-reset boundary, and delay nonblocking route-loading feedback briefly — preserves early notifications and prerendered content without blank navigation.
- Voice campaign controls use an in-page confirmation, serialize updates, and announce success only after persistence; call-log refreshes retain existing rows — avoids blocked browser confirmations, misleading feedback, and polling flicker.
<!-- LOVABLE:BEGIN -->
- Social drafts match published gallery captions by canonical image path, never index — avoids wrong captions.
- Explicit all-property backfills enrich manual listings too, preserve source copy, and resolve image URLs — avoids missing photos and lost facts.
- Social Engine resolves featured images with shared selection, uses inspected blog-only topical fallbacks, and fits Instagram media before webhook delivery without raw fallbacks — avoids unrelated or clipped photos.
<!-- LOVABLE:END -->
- Subdirectories have their own `AGENTS.md`; read it before changing files there.
- Firecrawl is a secondary fallback only: every call goes through `_shared/firecrawlBudget.ts` (`firecrawlFetch`) with a DB-backed monthly credit cap; Apify and the internal direct scraper run first — exhausted credits return a soft 402 so imports never block.
- New private-owner prospects are sent to Make.com outreach only via trigger `trg_fire_make_outreach` → `outreach-dispatch`; Make.com reports back through `outreach-status` (shared-secret header) into `prospect_listings.outreach_status` — one outreach channel avoids double WhatsApp sends. Every Make.com outreach payload carries `phone` as full international digits without `+` (Romanian mobile `07…` → `407…`), produced by the single helper `toOutreachPhone` in `_shared/waPhone.ts` — one phone shape keeps the Make scenario mapping valid.
- Agent integrations: tools live in `src/lib/mcp/` (one `defineTool` per file, OAuth via caller-scoped client + RLS); the `mcp` function is SDK-generated — never hand-edit, republish after changes.
- Internal team reminders are scheduled as rows in `public.admin_reminders` and delivered once by `functions/admin-reminder-check` (hourly pg_cron `admin-reminder-check-hourly`, status flips to `sent` before the next tick) — one delivery path prevents duplicate or ad-hoc pings.
