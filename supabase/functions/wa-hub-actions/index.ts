// wa-hub-actions — acțiunile rapide din „Centrul WhatsApp” (Admin):
//   • retry            → reia doar mesajele eșuate eligibile (+ opțional scoate pauza), pornește worker-ul
//   • test_targets     → numerele interne de test, mascate (numărul real rămâne pe server)
//   • test_send        → mesaj de test cu șablon aprobat către un număr intern, max 5/oră
//   • resolve_attention→ marchează o conversație „Atenție manuală” ca rezolvată
// Doar administratori. Fiecare acțiune se scrie în admin_audit_log.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { INTERNAL_WA_NUMBERS } from "../_shared/waInternalNumbers.ts";
import {
  ADMIN_ACTIONS, canSendTest, isAllowedTestTemplate, isRetryEligible, maskPhone,
  MAX_TEST_SENDS_PER_HOUR, resolvedConversationPatch, classifyQueueItem, type RetryMode,
} from "../_shared/waHubRules.ts";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TEST_TARGETS = [...INTERNAL_WA_NUMBERS];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const auth = await requireAdmin(req, corsHeaders);
  if (!auth.ok) return auth.response!;

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const action = String(body.action ?? "");

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(url, key, { auth: { persistSession: false } });

  let actorLabel: string | null = null;
  try {
    const { data } = await sb.auth.admin.getUserById(auth.userId!);
    actorLabel = data?.user?.email ?? null;
  } catch { /* intern */ }

  const audit = async (a: string, entityType: string, entityId: string | null, details: Record<string, unknown>, severity = "info") => {
    const { error } = await sb.from("admin_audit_log").insert({
      actor_user_id: auth.userId, actor_label: actorLabel ?? "system", action: a,
      entity_type: entityType, entity_id: entityId, details, severity,
    });
    if (error) console.error("[wa-hub-actions] audit insert failed:", error.message);
  };

  const call = async (fn: string, payload: unknown) => {
    const r = await fetch(`${url}/functions/v1/${fn}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, "x-webhook-secret": key },
      body: JSON.stringify(payload),
    });
    return { status: r.status, data: await r.json().catch(() => ({})) as Record<string, any> };
  };

  // ── Numere de test (mascate) ──────────────────────────────────────────────
  if (action === "test_targets") {
    return json({ targets: TEST_TARGETS.map((p, i) => ({ id: i, label: maskPhone(p) })), max_per_hour: MAX_TEST_SENDS_PER_HOUR });
  }

  // ── Mesaj de test ─────────────────────────────────────────────────────────
  if (action === "test_send") {
    const idx = Number(body.target);
    const template = String(body.template ?? "");
    const zone = String(body.zone ?? "Cetate").replace(/[^\p{L}\p{N} .,'-]/gu, "").slice(0, 40) || "Cetate";
    if (!Number.isInteger(idx) || idx < 0 || idx >= TEST_TARGETS.length) return json({ error: "invalid_target" }, 400);
    if (!isAllowedTestTemplate(template)) return json({ error: "template_not_allowed" }, 400);

    const since = new Date(Date.now() - 3_600_000).toISOString();
    const { count } = await sb.from("admin_audit_log").select("id", { count: "exact", head: true })
      .eq("action", ADMIN_ACTIONS.testSend).gte("created_at", since);
    if (!canSendTest(count ?? 0)) {
      return json({ error: "rate_limited", detail: `Maximum ${MAX_TEST_SENDS_PER_HOUR} mesaje de test pe oră.` }, 429);
    }

    const to = TEST_TARGETS[idx];
    const r = await call("wa-test-send", { to, template_name: template, template_language: "ro", template_params: [zone] });
    const ok = r.status < 300 && r.data?.ok !== false;
    const metaErr = r.data?.meta_error ?? null;
    await audit(ADMIN_ACTIONS.testSend, "wa_test", maskPhone(to), {
      template, zone, ok, http_status: r.status,
      meta_error_code: metaErr?.code ?? null, meta_error: metaErr?.message ?? r.data?.error ?? null,
    }, ok ? "info" : "warning");
    if (!ok) {
      return json({ ok: false, error: "send_failed", detail: metaErr?.message ?? r.data?.detail ?? r.data?.error ?? `HTTP ${r.status}`, code: metaErr?.code ?? null }, 200);
    }
    return json({ ok: true, to: maskPhone(to) });
  }

  // ── Reîncearcă / deblochează coada ────────────────────────────────────────
  if (action === "retry") {
    const ids = Array.isArray(body.queue_ids) ? (body.queue_ids as unknown[]).map(String).filter((v) => UUID.test(v)).slice(0, 200) : [];
    const mode: RetryMode = ids.length === 1 ? "single" : "bulk";
    const unpause = body.unpause === true;

    let q = sb.from("wa_outbound_queue").select("id, status, last_error, scheduled_at, created_at").eq("status", "failed");
    q = ids.length ? q.in("id", ids) : q.order("created_at", { ascending: false }).limit(500);
    const { data: failed, error } = await q;
    if (error) return json({ error: "load_failed", detail: error.message }, 500);

    const eligible: string[] = [];
    const skipped: Record<string, number> = {};
    for (const row of failed ?? []) {
      if (isRetryEligible(row, mode)) eligible.push(row.id);
      else { const b = classifyQueueItem(row); skipped[b] = (skipped[b] ?? 0) + 1; }
    }
    if (eligible.length) {
      const { error: upErr } = await sb.from("wa_outbound_queue")
        .update({ status: "pending", last_error: null, scheduled_at: new Date().toISOString() })
        .in("id", eligible).eq("status", "failed");
      if (upErr) return json({ error: "update_failed", detail: upErr.message }, 500);
    }

    let unpaused = false;
    if (unpause) {
      const { data: s } = await sb.from("wa_agent_settings").select("outbound_paused, outbound_pause_reason").eq("id", 1).maybeSingle();
      if (s?.outbound_paused) {
        const { error: pErr } = await sb.from("wa_agent_settings")
          .update({ outbound_paused: false, outbound_pause_reason: null, outbound_paused_at: null }).eq("id", 1);
        unpaused = !pErr;
        if (unpaused) await audit(ADMIN_ACTIONS.retry, "wa_agent_settings", "1", { unpaused: true, previous_reason: s.outbound_pause_reason ?? null }, "warning");
      }
    }

    let worker: Record<string, unknown> | null = null;
    if (eligible.length || unpaused || body.run_worker === true) {
      const w = await call("wa-outbound-queue-worker", { batch_size: 25 });
      const d = w.data ?? {};
      worker = {
        http_status: w.status,
        processed: d.processed ?? null,
        sent: d.sent ?? null,
        rate_limited: d.rate_limited ?? false,
        reason: d.reason ?? d.skipped ?? d.message ?? null,
      };
    }

    await audit(ADMIN_ACTIONS.retry, "wa_outbound_queue", ids.length === 1 ? ids[0] : null, {
      mode, requested: ids.length || "all_failed", retried: eligible.length, skipped, unpaused, worker,
    });
    return json({ ok: true, mode, retried: eligible.length, skipped, unpaused, worker });
  }

  // ── Rezolvă un caz de atenție manuală ─────────────────────────────────────
  if (action === "resolve_attention") {
    const id = String(body.conversation_id ?? "");
    if (!UUID.test(id)) return json({ error: "invalid_conversation" }, 400);
    const { data: conv } = await sb.from("wa_conversations").select("id, status, handoff_reason").eq("id", id).maybeSingle();
    if (!conv) return json({ error: "not_found" }, 404);
    const patch = resolvedConversationPatch(conv.status);
    const { error } = await sb.from("wa_conversations").update(patch).eq("id", id);
    if (error) return json({ error: "update_failed", detail: error.message }, 500);
    await audit(ADMIN_ACTIONS.resolve, "wa_conversation", id, {
      previous_status: conv.status, previous_reason: String(conv.handoff_reason ?? "").split(":")[0] || null,
      new_status: patch.status ?? conv.status,
    });
    return json({ ok: true, status: patch.status ?? conv.status });
  }

  return json({ error: "unknown_action" }, 400);
});
