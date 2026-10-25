# Edge Function Rules
- Andrei Training Lab simulates text-only Andrei vs Gemini-persona conversations in `voice-agent-training-lab` and applies admin-selected fixes as active playbook lessons — improves the prompt without placing real calls.
- Andrei's prompt appends objection points derived only from the listing's real price, zone and size/rooms via the shared policy helper; Training Lab can simulate real campaign listings by ID without calling owners — keeps objections factual and type-specific.
- SellerScan classifies `prospect_listings.seller_type` (privat/agentie/de_verificat) in a DB trigger from the agency blocklist, phone reuse across distinct listings and agency score; the batch campaign calls only `privat` — keeps agencies and unconfirmed sellers out of Andrei's automatic calls.
- Andrei's post-call WhatsApp follow-up is enqueued by `voice-agent-status` only after an explicit DA, via the approved Meta template in `_shared/andreiFollowup.ts`, skipping 131026/DNC/already-sent numbers — no unsolicited messages.
- Andrei books calendar slots via `_shared/andreiCalendar.ts`: slots are fetched only on firm intent, stored on the transcript entry and booked only from an explicit `[REZERVA:n]` marker after re-checking free/busy — prevents invented times and double bookings.
- Training Lab `auto_loop` runs in the background (daily cron), saves runs to `voice_call_analyses` (source `training_lab_auto`) and keeps at most 5 active playbook lessons — bounds AI cost and prompt size.
# Edge function rules

- Social Engine sends `social_posts` to Make.com only server-side via `process-scheduled-posts` (orchestrator */5, atomic claim, failure → draft, no retry); admin-only RLS — avoids silent no-cors failures and duplicates.
- AI image/text features run through shared handlers (_shared/aiClient, aiVision, aiText) exposed as `ai-vision` and `ai-text-generation`; legacy function URLs stay as thin entry points and text results are cached by sha256 in `ai_text_cache` — one auth/error/model path without breaking callers, crons or webhooks.
- Listing/contact pages ship a static #route-shell heading (prerender plugin) removed on first React H1 (max 3s) so real-user FCP/LCP don't wait for the JS bundle.
- WhatsApp first-contact templates always use the Meta-approved resolver (v6 → v5 → v3), never an environment override; outbound stops for DNC/STOP or any prior inbound interaction.
- Client qualification reuses history/zone and separates owner handover; AI reads latest ordered turns and discards stale replies — avoids repeated questions.
- Owner-consent queue messages resolve their dedicated template against Meta's approved Romanian body at send time; use the existing intro resolver until approval so inspection templates never reach owners.
- WhatsApp sends normalize phones via `_shared/waPhone.ts` (all format variants in DB lookups) and reserve the number in `request_idempotency` before calling Meta; no automatic resend after timeouts — prevents duplicate messages from parallel or delayed runs.
- Admin „Publică acum” calls `publish-consented-listing` (consent check, per-prospect lock, retries on 5xx, audit) instead of the worker directly — prevents double or silently failed publications.
- Lead inserts in edge functions never chain `.single()` after insert — the dedupe trigger returns 0 rows on merge and `.single()` makes the API roll the merge back.
- /analiza-anunt extracts listing data via `public-listing-analysis` and scores it deterministically in `listing-market-score` (scraper comparables, last 180 days) — keeps price/negotiation numbers reproducible instead of AI-invented.
- Voice Command Center cards load details/WhatsApp history on demand by prospect ID + phone variants; phone edits update both phone fields with concurrency checks, past conversations untouched — keeps records intact.
- Voice simulator gets the first visible prospect by ID via the admin-only context proxy; phone is separate from listing identity, stale responses discarded — preserves property context.
- Append the shared concise conversation policy after voice scripts and learned lessons, with sales examples only on sales calls; reuse it in drills — keeps runtime brevity and factuality rules consistent even with custom scripts.
- All automatic WhatsApp replies pass the shared guard and pre-send reservation — stops refusal and duplicate sends.
- Consent auto-publish only queues a social draft; `social.autopost_drain` posts one per interval via `_shared/metaSocial.ts`, claims first, logs per platform, falls back to draft on Meta errors; amenities only from fixed AI visual-tag vocabulary — avoids rate limits, duplicates, invented features.
- Blog autopilot saves one factual DRAFT per run; admin publishes; 402/403 pauses it.
- WhatsApp audits use real ordered turns; approved lessons stay separate from voice, with compare-and-restore rollback — prevents wrong-channel training.
- `handle-lead-whatsapp` always answers 200 and waits at most 3s for MAKE_WHATSAPP_WEBHOOK_URL via `_shared`-style local `sendToMake.ts` (never throws) — the "Calcul venit" form must show success even when Make is slow or down; webhook failures are logged only.
