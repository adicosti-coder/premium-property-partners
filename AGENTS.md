# Project Architecture Rules

- Keep the homepage hero LCP image sets strictly separated by mobile/desktop media queries so high-DPR phones never fetch desktop assets.
- Start the decorative desktop hero video only after genuine user interaction so the responsive image remains the stable LCP candidate.- Listing/contact pages ship a static #route-shell heading (prerender plugin) removed on first React H1 (max 3s) so real-user FCP/LCP don't wait for the JS bundle.
- WhatsApp first-contact templates always use the Meta-approved resolver (v6 → v5 → v3), never an environment override; outbound stops for DNC/STOP or any prior inbound interaction.
- Client qualification derives its saved zone and next step from WhatsApp history, never asks the zone twice, and keeps owner handover logic separate.
- Owner-consent queue messages resolve their dedicated template against Meta's approved Romanian body at send time; use the existing intro resolver until approval so inspection templates never reach owners.
- WhatsApp sends normalize phones via `_shared/waPhone.ts` (all format variants in DB lookups) and reserve the number in `request_idempotency` before calling Meta; no automatic resend after timeouts — prevents duplicate messages from parallel or delayed runs.
- The auto-consented listings view joins prospect/contact data with normalized WhatsApp profile names, shares tested formatting/search helpers, and exports the filtered rows — avoids invented owner data and mismatched CSV results.
- Automatic property publishing prepares a cropped stored cover before activation and derives bedrooms from original source descriptions via a shared deterministic helper — prevents raw portal footers and living rooms counted as bedrooms.
- The Advisor injects mandatory geography from stored property GPS or explicitly approximate district references and versions its cache when geography rules change — prevents stale or invented compass positioning.
- Admin „Publică acum” calls `publish-consented-listing` (consent check, per-prospect lock, retries on 5xx, audit) instead of the worker directly — prevents double or silently failed publications.
- Lead inserts in edge functions never chain `.single()` after insert — the dedupe trigger returns 0 rows on merge and `.single()` makes the API roll the merge back.
- /analiza-anunt extracts listing data via `public-listing-analysis` and scores it deterministically in `listing-market-score` (scraper comparables, last 180 days) — keeps price/negotiation numbers reproducible instead of AI-invented.
- Property offers and Advisor investment cards share `getPropertyInvestmentMetrics`, keeping unrounded annual income until display — prevents inconsistent yields and rental multipliers.
- Property maps and POI travel estimates use `propertyGeo` resolved GPS with explicit district fallback profiles — prevents imported Iosefin listings inheriting city-center coordinates or fixed travel times.
