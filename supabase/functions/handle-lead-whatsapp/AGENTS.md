# handle-lead-whatsapp rules
- `handle-lead-whatsapp` always answers 200 and waits at most 3s for MAKE_WHATSAPP_WEBHOOK_URL via `_shared`-style local `sendToMake.ts` (never throws) — the "Calcul venit" form must show success even when Make is slow or down; webhook failures are logged only.
