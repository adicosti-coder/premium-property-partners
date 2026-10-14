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
