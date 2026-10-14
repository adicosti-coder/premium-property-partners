# Project Architecture Rules

- Keep the homepage hero LCP image sets strictly separated by mobile/desktop media queries so high-DPR phones never fetch desktop assets.
- Start the decorative desktop hero video only after genuine user interaction so the responsive image remains the stable LCP candidate.
- Listing/contact pages ship a static #route-shell heading (prerender plugin) removed on first React H1 (max 3s) so real-user FCP/LCP don't wait for the JS bundle.
- WhatsApp first-contact templates always use the Meta-approved resolver (v6 → v5 → v3), never an environment override; outbound stops for DNC/STOP or any prior inbound interaction.
- Client qualification reuses history/zone and separates owner handover; AI reads latest ordered turns and discards stale replies — avoids repeated questions.
- Owner-consent queue messages resolve their dedicated template against Meta's approved Romanian body at send time; use the existing intro resolver until approval so inspection templates never reach owners.
- WhatsApp sends normalize phones via `_shared/waPhone.ts` (all format variants in DB lookups) and reserve the number in `request_idempotency` before calling Meta; no automatic resend after timeouts — prevents duplicate messages from parallel or delayed runs.
- Auto-consented listings view joins prospect/contact data with normalized WhatsApp names and exports filtered rows via shared tested helpers — avoids invented owner data.
- Automatic property publishing prepares a cropped stored cover before activation and derives bedrooms from original source descriptions via a shared deterministic helper — prevents raw portal footers and living rooms counted as bedrooms.
- The Advisor injects mandatory geography from stored property GPS or explicitly approximate district references and versions its cache when geography rules change — prevents stale or invented compass positioning.
- Admin „Publică acum” calls `publish-consented-listing` (consent check, per-prospect lock, retries on 5xx, audit) instead of the worker directly — prevents double or silently failed publications.
- Lead inserts in edge functions never chain `.single()` after insert — the dedupe trigger returns 0 rows on merge and `.single()` makes the API roll the merge back.
- /analiza-anunt extracts listing data via `public-listing-analysis` and scores it deterministically in `listing-market-score` (scraper comparables, last 180 days) — keeps price/negotiation numbers reproducible instead of AI-invented.
- Property offers and Advisor investment cards share `getPropertyInvestmentMetrics`, keeping unrounded annual income until display — prevents inconsistent yields and rental multipliers.
- Property maps and POI travel estimates use `propertyGeo` resolved GPS with explicit district fallback profiles — prevents imported Iosefin listings inheriting city-center coordinates or fixed travel times.
- Voice Command Center cards load details/WhatsApp history on demand by prospect ID + phone variants; phone edits update both phone fields with concurrency checks, past conversations untouched — keeps records intact.
- Voice simulator gets the first visible prospect by ID via the admin-only context proxy; phone is separate from listing identity, stale responses discarded — preserves property context.
- Chunk-load recovery allows at most one automatic refresh per URL per minute and never refreshes offline or deletes unrelated caches — prevents reload loops and preserves cached resources.
- Keep toast hosts mounted at startup, isolate route errors with a location-reset boundary, and delay nonblocking route-loading feedback briefly — preserves early notifications and prerendered content without blank navigation.
- Voice campaign controls use an in-page confirmation, serialize updates, and announce success only after persistence; call-log refreshes retain existing rows — avoids blocked browser confirmations, misleading feedback, and polling flicker.
- Append the shared concise conversation policy after voice scripts and learned lessons, with sales examples only on sales calls; reuse it in drills — keeps runtime brevity and factuality rules consistent even with custom scripts.
- All automatic WhatsApp replies pass the shared guard and pre-send reservation — stops refusal and duplicate sends.
- Consent auto-publish only queues a social draft; `social.autopost_drain` posts one per interval via `_shared/metaSocial.ts`, claims first, logs per platform, falls back to draft on Meta errors; amenities only from fixed AI visual-tag vocabulary — avoids rate limits, duplicates, invented features.
- Blog autopilot saves one factual DRAFT per run; admin publishes; 402/403 pauses it.
- WhatsApp audits use real ordered turns; approved lessons stay separate from voice, with compare-and-restore rollback — prevents wrong-channel training.
<!-- LOVABLE:BEGIN -->
- Social drafts match published gallery captions by canonical image path, never index — avoids wrong captions.
- Explicit all-property backfills enrich manual listings too, preserve source copy, and resolve image URLs — avoids missing photos and lost facts.
- Social Engine resolves featured images with shared selection, uses inspected blog-only topical fallbacks, and fits Instagram media before webhook delivery without raw fallbacks — avoids unrelated or clipped photos.
<!-- LOVABLE:END -->
- Social Engine sends `social_posts` to Make.com only server-side via `process-scheduled-posts` (orchestrator */5, atomic claim, failure → draft, no retry); admin-only RLS — avoids silent no-cors failures and duplicates.
- AI image/text features run through shared handlers (_shared/aiClient, aiVision, aiText) exposed as `ai-vision` and `ai-text-generation`; legacy function URLs stay as thin entry points and text results are cached by sha256 in `ai_text_cache` — one auth/error/model path without breaking callers, crons or webhooks.
