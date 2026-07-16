# Sprint 5 — Andrei WhatsApp Agent (WhatsApp-first)

## Scop

Andrei devine WhatsApp-first: primul contact cu proprietarii este pe WhatsApp text (via Meta Cloud API), condus de GPT-5.4-mini prin Lovable AI, reutilizând `voice-agent-context-proxy` pentru memorie și persona. Apelul vocal (ElevenLabs) rămâne disponibil DOAR ca escaladare (declanșată de admin sau când LLM-ul decide „lead calificat, sună acum").

Nu ștergem nimic din stack-ul voice existent — doar adăugăm canalul WhatsApp și un „router" de canal deasupra.

## Arhitectură (high-level)

```text
                    ┌─────────────────────────┐
   Proprietar ─▶ WA │ Meta WhatsApp Cloud API │ ─▶ webhook ─┐
                    └─────────────────────────┘             │
                                                            ▼
                                              ┌──────────────────────────┐
                                              │ wa-andrei-webhook (EF)   │  ← verify + inbound
                                              │  • idempotency wa_msg_id │
                                              │  • upsert conversation   │
                                              │  • enqueue reply job     │
                                              └────────────┬─────────────┘
                                                           ▼
                                              ┌──────────────────────────┐
                                              │ wa-andrei-reply (EF)     │
                                              │  • load context (proxy)  │
                                              │  • load thread history   │
                                              │  • GPT-5.4-mini via      │
                                              │    Lovable AI Gateway    │
                                              │  • tool: escalate_to_call│
                                              │  • tool: mark_qualified  │
                                              │  • send via wa-andrei-   │
                                              │    send                  │
                                              └────────────┬─────────────┘
                                                           ▼
                                              ┌──────────────────────────┐
                                              │ wa-andrei-send (EF)      │
                                              │  • template vs freeform  │
                                              │  • 24h window check      │
                                              │  • log outbound          │
                                              └──────────────────────────┘

   Admin UI (WhatsappAgentInbox.tsx) ── realtime pe wa_messages
```

## 1. Backend (DB)

Migrare nouă `2026xxxx_whatsapp_agent.sql`:

- `wa_conversations` — 1 rând per (phone_normalized, prospect_id?).
  Coloane: `id`, `phone_normalized`, `prospect_id` (FK opțional către prospect existent), `status` (`active`/`awaiting_human`/`escalated_to_call`/`closed`), `last_inbound_at`, `last_outbound_at`, `window_expires_at` (last_inbound + 24h — regula Meta pentru freeform), `assigned_channel` (`whatsapp`/`voice`), `handoff_reason`, `qualification_score`, `created_at`.
- `wa_messages` — istoric complet.
  Coloane: `id`, `conversation_id` (FK), `wa_message_id` (unique — idempotency), `direction` (`inbound`/`outbound`), `role` (`user`/`assistant`/`system`/`tool`), `content` (text), `media_url` (nullable), `template_name` (nullable pentru outbound in afara ferestrei 24h), `ai_model`, `ai_tokens_in/out`, `created_at`, `error` (nullable).
- `wa_agent_settings` — 1 rând singleton.
  Coloane: `enabled` (kill switch), `system_prompt` (persona Andrei), `escalation_threshold` (score 0-100 peste care LLM sugerează apel), `office_hours_only` (bool), `paused_reason`, `updated_at`.

GRANT-uri:
- `wa_conversations`, `wa_messages`: `GRANT ALL ... TO service_role`; `GRANT SELECT ... TO authenticated` (doar admin — filtrat prin RLS `has_role(auth.uid(), 'admin')`).
- `wa_agent_settings`: `SELECT`/`UPDATE` admin, `ALL` service_role.

RLS: enable pe toate, policy `admin only` folosind `public.has_role`.

Realtime: `alter publication supabase_realtime add table wa_messages, wa_conversations` — UI-ul admin ascultă live.

## 2. Edge Functions

### `wa-andrei-webhook` (verify_jwt = false, public)
- `GET` → returnează `hub.challenge` dacă `hub.verify_token === WHATSAPP_VERIFY_TOKEN` (Meta subscription).
- `POST` → validează signature `X-Hub-Signature-256` cu `WHATSAPP_APP_SECRET`. Parsează `entry[].changes[].value.messages[]`. Pentru fiecare mesaj:
  1. Idempotency: upsert în `wa_messages` cu unique `wa_message_id`; dacă există → 200 imediat.
  2. Upsert `wa_conversations` (phone_normalized + link prospect via `v_prospect_funnel` dacă găsim match).
  3. Insert inbound message.
  4. Update `window_expires_at = now() + 24h`.
  5. Invoke `wa-andrei-reply` async (fire-and-forget cu `waitUntil` echivalent — `.then()` fără await pe response).
  6. Răspunde 200 imediat (Meta reia webhook-ul dacă nu primește 200 < 20s).

### `wa-andrei-reply` (verify_jwt = false, invoked de webhook)
- Input: `{ conversation_id }`.
- Verifică `wa_agent_settings.enabled` — dacă `false`, exit cu log.
- Verifică `office_hours_only` + `isOfficeHours()` — dacă e în afara programului, marchează conversation `awaiting_human` și exit (proprietarul primește reply în ziua următoare, admin vede în inbox).
- Încarcă istoric ultimele ~20 mesaje din `wa_messages` (ordered).
- Încarcă context prospect via invoke `voice-agent-context-proxy` cu phone (reutilizare 1:1 — aceeași memorie ca voice).
- Construiește messages array:
  - system: `wa_agent_settings.system_prompt` + injectat context (`agent_memory_context`).
  - history: mapare `wa_messages.role/content`.
- Call Lovable AI Gateway cu AI SDK (`@ai-sdk/openai-compatible`), model `openai/gpt-5.4-mini`, `providerOptions.lovable.service_tier: "priority"` (mini e ✓ fast mode → răspuns rapid pe WhatsApp).
- Tools disponibile modelului (via AI SDK `tool()` cu `stopWhen: stepCountIs(50)`):
  - `escalate_to_call({ reason })` — set `conversation.status = 'escalated_to_call'`, invoke `voice-agent-initiate` cu phone. `needsApproval: true` DOAR dacă `office_hours_only` — altfel auto.
  - `mark_qualified({ score, notes })` — update `qualification_score`, notify admin dacă >= threshold.
  - `request_property_details({ zone?, rooms?, price? })` — pur informativ, actualizează prospect record.
  - `handoff_human({ reason })` — set `status = 'awaiting_human'`, oprește AI reply-uri pe conversation până admin re-activează.
- Trimite răspunsul prin invoke `wa-andrei-send`.
- Insert outbound în `wa_messages` cu `ai_model`, tokens.

Nota GPT-5.4-mini: obligatoriu `reasoningEffort: "none"` NU e cerut (doar 5.6-* îl cere). 5.4-mini e ✓ priority → păstrăm `service_tier: "priority"` prin `providerOptions.lovable`.

### `wa-andrei-send` (verify_jwt = false, internal-only — protejat cu `x-internal-secret`)
- Input: `{ conversation_id, text, template_name?, template_params? }`.
- Check `wa_conversations.window_expires_at`:
  - În fereastră 24h → POST freeform text către `https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_NUMBER_ID}/messages` cu `type: "text"`.
  - În afara ferestrei → REQUIRE `template_name` (Meta blochează freeform); dacă nu e furnizat, marchează `awaiting_human` cu `error: "outside_24h_window_no_template"`.
- Header: `Authorization: Bearer ${WHATSAPP_ACCESS_TOKEN}`.
- Update `wa_conversations.last_outbound_at`.
- Log outbound în `wa_messages`.

## 3. Frontend admin

Nou: `src/components/admin/WhatsappAgentInbox.tsx` — un tab nou în `AutomationManager` (sau nou tab top-level în `/admin?tab=whatsapp-andrei`, decidem în implementare — probabil separat pentru claritate).

Layout inbox split:
- Stânga: listă `wa_conversations` sortată după `last_inbound_at desc`, badge-uri: nou (unread), awaiting_human, escalated, qualified score.
- Dreapta: thread selectat — mesaje user/assistant stilizate ca WhatsApp, cu meta (model, tokens, template folosit).
- Actions per conversation: „Preia (pauză AI)", „Escaladează la apel voce (Andrei sună)", „Trimite template outreach", „Închide".
- Realtime subscribe pe `wa_messages` + `wa_conversations`.

Reutilizează `AdminPageShell` din Sprint 2.

Setări (component mic în același tab sau card sub inbox): toggle `enabled`, textarea `system_prompt`, slider `escalation_threshold`, toggle `office_hours_only`.

## 4. Secrete necesare (Meta Cloud API)

User trebuie să configureze WhatsApp Business App în Meta Developer Console și să pornească:
1. `WHATSAPP_ACCESS_TOKEN` — permanent system-user token (Meta Business Settings).
2. `WHATSAPP_PHONE_NUMBER_ID` — id-ul numărului business.
3. `WHATSAPP_VERIFY_TOKEN` — random, generat de noi cu `generate_secret` (îl folosim în URL webhook la subscribe în Meta).
4. `WHATSAPP_APP_SECRET` — pentru validare signature webhook.
5. `WA_ANDREI_INTERNAL_SECRET` — generat cu `generate_secret`, folosit între edge functions să nu poată fi apelate din exterior.

Explicit înainte de request: user trebuie să deploy-ăm întâi `wa-andrei-webhook`, apoi îi dăm URL-ul + `WHATSAPP_VERIFY_TOKEN` să le pună în Meta App → Webhooks → Subscribe → `messages`.

`LOVABLE_API_KEY` — deja există (verificat via `fetch_secrets` la execuție).

## 5. Persona system prompt (default)

Populate `wa_agent_settings.system_prompt` la migrare cu textul „Andrei" adaptat pentru WhatsApp text (mai scurt, emoji parcimonios, listing questions structurate). Reutilizează spec-ul din `voice-agent-scripts` — extragem un fișier `supabase/functions/_shared/andrei-wa-persona.md` inclus la migrare ca default row.

## Ce NU face acest sprint

- NU dezactivează / șterge stack-ul voice existent (rămâne pentru escaladare + campanii bulk).
- NU migrează `voice_ghosting_queue` pe fluxul nou (rămâne mecanismul manual wa.me pentru lead-urile vechi din queue). Îl putem contopi în Sprint 6 dacă WhatsApp Cloud funcționează bine.
- NU implementează template management în UI — folosim template `hello_world` default + un template `andrei_reengage_24h` pe care user-ul îl aprobă în Meta Business Manager (dăm textul în handoff).
- NU adaugă suport media (imagini, PDF-uri) inbound — doar text în v1; media inbound → `awaiting_human` cu link download.

## Ordine execuție (când confirmi planul)

1. Migrare DB + GRANT + RLS + realtime publication + default settings row.
2. `generate_secret` pentru `WHATSAPP_VERIFY_TOKEN` și `WA_ANDREI_INTERNAL_SECRET`.
3. Edge functions în ordine: `wa-andrei-send` → `wa-andrei-reply` → `wa-andrei-webhook`.
4. `add_secret` pentru cele 3 credențiale Meta (după ce user-ul le are din Meta Console — îi dăm URL webhook + verify token).
5. Frontend `WhatsappAgentInbox.tsx` + tab în admin.
6. Typecheck. Test manual: mesaj real din telefon → verificăm în inbox că apare + Andrei răspunde.

## Verificare finală (după deploy)

- Trimit `wa` de pe telefonul meu la numărul business → apare în inbox în < 3s (realtime).
- Andrei răspunde în < 8s cu context prospect (dacă phone-ul e în `v_prospect_funnel`).
- Simulăm ieșire din fereastra 24h (manual update `window_expires_at`) → verifică că LLM cere template sau marchează `awaiting_human`.
- Butonul „Escaladează la apel" → invocă `voice-agent-initiate` (stack vechi, testat).

## Ambiguități rămase (pot decide singur în build, dar semnalez)

- **Multi-număr**: presupun 1 singur număr WhatsApp business. Dacă vrei multiple (RealTrust vs ApArt), adaug `wa_business_number_id` pe conversation și un router. Confirmă dacă e cazul.
- **Prospect matching**: fac join pe `phone_normalized` cu `v_prospect_funnel`; dacă nu găsesc, creez conversation orfană (`prospect_id = null`) și admin poate lega manual. OK așa?
- **Rate limiting**: nu adaug rate limit explicit pe reply loop; mă bazez pe rate limit-ul Lovable AI Gateway (429 → retry cu backoff simplu). Dacă vrei hard limit „max 1 reply / 5s per conversation" ca să nu spameze la un utilizator care trimite 10 mesaje rapide, spune.
