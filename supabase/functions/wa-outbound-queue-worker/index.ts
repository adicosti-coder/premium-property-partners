// wa-outbound-queue-worker — golește coada de mesaje inițiale (marketing template)
// către proprietarii extrași de scraper. Rulează pe cron sau manual din Admin.
// Internal-only (cron secret / service role) sau admin.
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { isInternalCall } from "../_shared/cronAuth.ts";
import { fetchWithRetry } from "../_shared/fetchRetry.ts";
import { drainMakeRelayDlq, relayToMake } from "../_shared/makeRelay.ts";
import { preferredIntroTemplate, preferredPublishConsentTemplate } from "../_shared/waPreferredTemplate.ts";
import { WA_PUBLISH_CONSENT_TEMPLATE, consentPropertyLabel } from "../_shared/waPublishConsentTemplate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const MAX_ATTEMPTS = 3;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (!(await isInternalCall(req))) {
    const auth = await requireAdmin(req, corsHeaders);
    if (!auth.ok) return auth.response!;
  }

  let body: { batch_size?: number; queue_id?: string; force?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const batchSize = Math.min(50, Math.max(1, Number(body.batch_size) || 10));
  const force = body.force === true;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const internalSecret = Deno.env.get("WA_ANDREI_INTERNAL_SECRET") || "";
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // ── Deblocare: mesaje rămase „în trimitere” după un timeout de funcție ─────
  // Fără asta, rândul rămâne blocat pentru totdeauna și proprietarul nu e contactat.
  try {
    const staleBefore = new Date(Date.now() - 15 * 60_000).toISOString();
    const { data: unstuck } = await supabase
      .from("wa_outbound_queue")
      .update({ status: "pending", last_error: "reluat: trimitere întreruptă" })
      .eq("status", "sending")
      .lt("updated_at", staleBefore)
      .select("id");
    if (unstuck?.length) {
      console.warn(`[wa-outbound-worker] reset ${unstuck.length} stuck 'sending' rows`);
    }
  } catch (e) {
    console.error("[wa-outbound-worker] stuck reset failed:", e);
  }

  // ── Reia notificările Make.com respinse anterior (ex: „Queue is full") ─────
  let makeRelayRetry: Awaited<ReturnType<typeof drainMakeRelayDlq>> | null = null;
  try {
    makeRelayRetry = await drainMakeRelayDlq(supabase, 20);
  } catch (e) {
    console.error("[wa-outbound-worker] make relay drain failed:", e);
  }

  // ── Anti-spam / Meta rate limit guard ──────────────────────────────────────
  const { data: settings } = await supabase
    .from("wa_agent_settings")
    .select(
      "outbound_max_per_hour, outbound_max_per_day, outbound_min_delay_seconds, outbound_max_delay_seconds, outbound_auto_pause_enabled, outbound_min_delivery_rate, outbound_max_consecutive_failures, outbound_paused, outbound_pause_reason, outbound_send_start_hour, outbound_send_end_hour, outbound_send_days",
    )
    .eq("id", 1)
    .maybeSingle();

  const maxPerHour = Math.max(0, Number(settings?.outbound_max_per_hour ?? 20));
  const maxPerDay = Math.max(0, Number(settings?.outbound_max_per_day ?? 100));
  const minDelay = Math.max(0, Number(settings?.outbound_min_delay_seconds ?? 30));
  const maxDelay = Math.max(minDelay, Number(settings?.outbound_max_delay_seconds ?? 90));
  const autoPauseEnabled = settings?.outbound_auto_pause_enabled !== false;
  const minDeliveryRate = Math.max(0, Number(settings?.outbound_min_delivery_rate ?? 80));
  const maxConsecutiveFailures = Math.max(1, Number(settings?.outbound_max_consecutive_failures ?? 3));

  // ── Safety switch: worker în pauză (manual sau auto) ───────────────────────
  if (settings?.outbound_paused === true && !force) {
    return json({
      ok: true,
      processed: 0,
      paused: true,
      pause_reason: settings?.outbound_pause_reason ?? "auto_pause",
    });
  }

  // ── Orar de liniște: mesajele pleacă doar în fereastra permisă (Bucharest) ─
  const startHour = Math.min(23, Math.max(0, Number(settings?.outbound_send_start_hour ?? 9)));
  const endHour = Math.min(24, Math.max(startHour + 1, Number(settings?.outbound_send_end_hour ?? 20)));
  const allowedDays: number[] = Array.isArray(settings?.outbound_send_days) && settings!.outbound_send_days.length
    ? (settings!.outbound_send_days as number[]).map(Number)
    : [1, 2, 3, 4, 5, 6];

  const roNow = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Bucharest" }),
  );
  const roHour = roNow.getHours();
  const roDay = roNow.getDay(); // 0 = duminică
  const inSendWindow = allowedDays.includes(roDay) && roHour >= startHour && roHour < endHour;

  if (!inSendWindow && !force) {
    return json({
      ok: true,
      processed: 0,
      outside_send_window: true,
      local_time: `${String(roHour).padStart(2, "0")}:${String(roNow.getMinutes()).padStart(2, "0")}`,
      window: `${startHour}:00–${endHour}:00`,
      allowed_days: allowedDays,
    });
  }

  /** Oprește worker-ul și notifică adminii. */
  const autoPause = async (reason: string, detail: Record<string, unknown>) => {
    await supabase
      .from("wa_agent_settings")
      .update({
        outbound_paused: true,
        outbound_paused_at: new Date().toISOString(),
        outbound_pause_reason: reason,
      })
      .eq("id", 1);

    try {
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      const rows = (admins ?? []).map((a: { user_id: string }) => ({
        user_id: a.user_id,
        type: "warning",
        title: "WhatsApp outbound pus pe pauză automat",
        message: `Protecția numărului s-a activat: ${reason}. ${JSON.stringify(detail)}`,
        action_url: "/admin/whatsapp-queue",
        action_label: "Vezi coada",
      }));
      if (rows.length) await supabase.from("user_notifications").insert(rows);
    } catch (e) {
      console.error("[wa-outbound-worker] admin notify failed:", e);
    }
    console.error(`[wa-outbound-worker] AUTO-PAUSE: ${reason}`, detail);
  };

  // ── Health check pre-run: rata de livrare + erori consecutive Meta ─────────
  if (autoPauseEnabled && !force) {
    const since = new Date(Date.now() - 24 * 3_600_000).toISOString();

    // Protecția numărului: erorile Meta de calitate/spam opresc imediat coada.
    const { data: riskRows } = await supabase
      .from("wa_outbound_queue")
      .select("last_error")
      .eq("status", "failed")
      .gte("updated_at", since)
      .limit(100);
    const META_RISK = /\b(131048|131056|368|130497|131031|130429)\b/;
    const risky = (riskRows ?? []).filter((r) => META_RISK.test(r.last_error ?? ""));
    if (risky.length) {
      await autoPause("meta_quality_risk", {
        errors: risky.length,
        sample: String(risky[0].last_error ?? "").slice(0, 200),
      });
      return json({ ok: true, processed: 0, paused: true, meta_quality_risk: risky.length });
    }

    const { data: recent } = await supabase
      .from("wa_outbound_queue")
      .select("status, delivered_at, read_at, replied_at, sent_at, last_error")
      .gte("sent_at", since)
      .not("sent_at", "is", null)
      .order("sent_at", { ascending: false })
      .limit(200);

    // Rata de livrare se calculează doar pe mesajele cu rezultat cunoscut
    // (confirmate livrate sau respinse de Meta). Confirmările lipsă nu sunt eșecuri.
    const rows = recent ?? [];
    const delivered = rows.filter((r) => r.delivered_at || r.read_at || r.replied_at).length;
    const rejected = rows.filter((r) => r.status === "failed" && !/131026/.test(r.last_error ?? "")).length;
    const known = delivered + rejected;
    if (known >= 10) {
      const rate = Math.round((delivered / known) * 100);
      if (rate < minDeliveryRate) {
        await autoPause("delivery_rate_low", {
          delivery_rate: rate,
          threshold: minDeliveryRate,
          sample: known,
        });
        return json({ ok: true, processed: 0, paused: true, delivery_rate: rate });
      }
    }

    // Doar eșecurile din ultimele 24h care țin de sănătatea numărului.
    // Erorile de configurare a șablonului (404 / 132001) nu blochează coada.
    const { data: lastAttempts } = await supabase
      .from("wa_outbound_queue")
      .select("status, last_error")
      .in("status", ["sent", "failed", "replied"])
      .gte("updated_at", since)
      .order("updated_at", { ascending: false })
      .limit(maxConsecutiveFailures * 3);
    const TEMPLATE_CFG = /template_invalid|http_404|132001|does not exist/i;
    const attempts = (lastAttempts ?? [])
      .filter((a) => !(a.status === "failed" && TEMPLATE_CFG.test(a.last_error ?? "")))
      .slice(0, maxConsecutiveFailures);
    if (
      attempts.length >= maxConsecutiveFailures &&
      attempts.every((a) => a.status === "failed")
    ) {
      await autoPause("consecutive_meta_failures", {
        consecutive_failures: attempts.length,
        threshold: maxConsecutiveFailures,
      });
      return json({ ok: true, processed: 0, paused: true, consecutive_failures: attempts.length });
    }
  }

  let allowance = batchSize;
  if (!force) {
    const nowMs = Date.now();
    const [{ count: hourCount }, { count: dayCount }] = await Promise.all([
      supabase
        .from("wa_outbound_queue")
        .select("id", { count: "exact", head: true })
        .eq("status", "sent")
        .gte("sent_at", new Date(nowMs - 3_600_000).toISOString()),
      supabase
        .from("wa_outbound_queue")
        .select("id", { count: "exact", head: true })
        .eq("status", "sent")
        .gte("sent_at", new Date(nowMs - 86_400_000).toISOString()),
    ]);
    allowance = Math.min(
      batchSize,
      Math.max(0, maxPerHour - (hourCount ?? 0)),
      Math.max(0, maxPerDay - (dayCount ?? 0)),
    );
    if (allowance <= 0) {
      return json({
        ok: true,
        processed: 0,
        rate_limited: true,
        sent_last_hour: hourCount ?? 0,
        sent_last_day: dayCount ?? 0,
        max_per_hour: maxPerHour,
        max_per_day: maxPerDay,
      });
    }
  }

  // ── Curățare: mesajele necontactate pentru anunțuri mai vechi de 10 zile se anulează ──
  if (!body.queue_id) {
    const cutoff = new Date(Date.now() - 10 * 86_400_000).toISOString();
    const { data: stale } = await supabase
      .from("wa_outbound_queue")
      .select("id, created_at, prospect_listing_id, prospect_listings(created_at)")
      .eq("status", "pending")
      .is("sent_at", null)
      .limit(500);
    const staleIds = (stale ?? [])
      .filter((r: any) => (r.prospect_listings?.created_at ?? r.created_at) < cutoff)
      .map((r: any) => r.id);
    if (staleIds.length) {
      await supabase
        .from("wa_outbound_queue")
        .update({ status: "cancelled", last_error: "stale_over_10_days", updated_at: new Date().toISOString() })
        .in("id", staleIds);
    }
  }

  const SELECT_COLS =
    "id, phone_normalized, prospect_listing_id, template_name, template_language, template_params, attempts, conversation_id, source, priority, scheduled_at, prospect_listings(created_at, lead_score)";
  let query = supabase.from("wa_outbound_queue").select(SELECT_COLS);

  if (body.queue_id) {
    query = query.eq("id", body.queue_id).in("status", ["pending", "failed"]);
  } else {
    query = query
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .limit(300);
  }

  const { data: candidates, error } = await query;

  if (error) return json({ error: error.message }, 500);
  // Prioritate: anunțuri din ultimele 48h, apoi prioritatea cozii, scorul, cele mai noi primele.
  const recentCut = Date.now() - 48 * 3_600_000;
  const rank = (r: any) => {
    const created = Date.parse(r.prospect_listings?.created_at ?? "") || 0;
    return { fresh: created >= recentCut ? 1 : 0, pri: Number(r.priority ?? 0), score: Number(r.prospect_listings?.lead_score ?? 0), created };
  };
  const queue = (candidates ?? [])
    .map((r: any) => ({ r, k: rank(r) }))
    .sort((a, b) => b.k.fresh - a.k.fresh || b.k.pri - a.k.pri || b.k.score - a.k.score || b.k.created - a.k.created)
    .slice(0, body.queue_id ? 1 : allowance)
    .map(({ r }) => r);
  if (!queue.length) return json({ ok: true, processed: 0 });

  // ── Lock global: o singură rulare a cozii odată (anti-execuție paralelă) ──
  const LOCK_SCOPE = "wa-outbound-queue-worker";
  const LOCK_KEY = "global-run-lock";
  const lockExpires = new Date(Date.now() + 90_000).toISOString();
  const { error: lockErr } = await supabase
    .from("request_idempotency")
    .insert({ scope: LOCK_SCOPE, key: LOCK_KEY, expires_at: lockExpires });
  if (lockErr) {
    if (lockErr.code !== "23505") return json({ error: "lock_failed" }, 500);
    const { data: lockRow } = await supabase.from("request_idempotency")
      .select("expires_at").eq("scope", LOCK_SCOPE).eq("key", LOCK_KEY).maybeSingle();
    const stale = !lockRow || new Date(lockRow.expires_at).getTime() < Date.now();
    if (!stale) return json({ ok: true, processed: 0, skipped: "already_running" });
    const { data: retaken } = await supabase.from("request_idempotency")
      .update({ expires_at: lockExpires })
      .eq("scope", LOCK_SCOPE).eq("key", LOCK_KEY).eq("expires_at", lockRow.expires_at)
      .select("key");
    if (!retaken?.length) return json({ ok: true, processed: 0, skipped: "already_running" });
  }
  const releaseLock = async () => {
    await supabase.from("request_idempotency").delete()
      .eq("scope", LOCK_SCOPE).eq("key", LOCK_KEY).eq("expires_at", lockExpires);
  };
  const sessionPhones = new Set<string>();

  const results: Record<string, unknown>[] = [];
  const startedAt = Date.now();
  let consecutiveFailures = 0;
  let permanentFailures = 0;
  // Rămâne loc pentru încă un ciclu de trimitere înainte de timeout-ul funcției.
  const TIME_BUDGET_MS = 40_000;

  for (const [idx, item] of queue.entries()) {
    // ── Listă excludere (DNC / agenții / refuzuri) ───────────────────────────
    const { data: dnc } = await supabase
      .from("wa_dnc_list")
      .select("reason, label")
      .eq("phone_normalized", item.phone_normalized)
      .maybeSingle();

    if (dnc) {
      await supabase
        .from("wa_outbound_queue")
        .update({
          status: "cancelled",
          last_error: `blocat: număr în lista de excludere (${dnc.label}${dnc.reason ? ` — ${dnc.reason}` : ""})`,
        })
        .eq("id", item.id)
        .in("status", ["pending", "failed"]);
      results.push({ id: item.id, status: "blocked_dnc" });
      continue;
    }

    // Orice interacțiune inbound anterioară oprește definitiv primul contact
    // automat. Include răspunsurile la alte conversații ale aceluiași număr.
    const isFollowup = item.source === "followup" || item.source === "followup2";
    if (!isFollowup) {
      const { data: priorConversations } = await supabase
        .from("wa_conversations")
        .select("last_inbound_at, status")
        .eq("phone_normalized", item.phone_normalized);
      const hadPriorInteraction = priorConversations?.some((conversation) => conversation.last_inbound_at);
      const stopped = priorConversations?.some((conversation) =>
        ["closed", "handoff", "opted_out"].includes(String(conversation.status || ""))
      );
      if (hadPriorInteraction || stopped) {
        await supabase
          .from("wa_outbound_queue")
          .update({
            status: "cancelled",
            last_error: stopped
              ? "blocat: conversație închisă, transferată sau dezabonată"
              : "blocat: există o interacțiune anterioară de la acest număr",
          })
          .eq("id", item.id)
          .in("status", ["pending", "failed"]);
        results.push({ id: item.id, status: stopped ? "blocked_stopped" : "blocked_prior_interaction" });
        continue;
      }
    }

    // ── Lock per număr în aceeași sesiune: max 1 mesaj / număr / rulare ──────
    if (sessionPhones.has(item.phone_normalized)) {
      results.push({ id: item.id, status: "deferred", reason: "same_phone_this_session" });
      continue;
    }
    sessionPhones.add(item.phone_normalized);

    // ── Deduplicare: prim contact deja trimis către același număr ────────────
    // Follow-up-urile sunt intenționat un al doilea mesaj, deci sunt exceptate.
    let alreadySent = false;
    if (!isFollowup) {
      const dedupSince = new Date(Date.now() - 72 * 3_600_000).toISOString();
      const since24h = new Date(Date.now() - 24 * 3_600_000).toISOString();
      const [{ count: recentCount }, { count: inFlight }, { data: convs }] = await Promise.all([
        supabase.from("wa_outbound_queue").select("id", { count: "exact", head: true })
          .eq("phone_normalized", item.phone_normalized).neq("id", item.id)
          .in("status", ["sent", "replied"]).gte("sent_at", dedupSince),
        supabase.from("wa_outbound_queue").select("id", { count: "exact", head: true })
          .eq("phone_normalized", item.phone_normalized).neq("id", item.id)
          .eq("status", "sending"),
        supabase.from("wa_conversations").select("id").eq("phone_normalized", item.phone_normalized),
      ]);
      alreadySent = (recentCount ?? 0) > 0 || (inFlight ?? 0) > 0;
      if (!alreadySent && convs?.length) {
        // Verificare și pe mesajele efectiv livrate către Meta în ultimele 24h.
        const { count: msgCount } = await supabase
          .from("wa_messages").select("id", { count: "exact", head: true })
          .in("conversation_id", convs.map((c: any) => c.id))
          .eq("direction", "outbound").is("error", null)
          .not("wa_message_id", "is", null)
          .gte("created_at", since24h);
        alreadySent = (msgCount ?? 0) > 0;
      }
    }

    if (alreadySent) {
      await supabase
        .from("wa_outbound_queue")
        .update({
          status: "sent",
          last_error: "duplicat: prim contact deja trimis către acest număr — nu se retrimite",
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id)
        .in("status", ["pending", "failed"]);
      results.push({ id: item.id, status: "skipped_duplicate_marked_sent" });
      continue;
    }

    // Jitter uman între trimiteri succesive (anti-bot Meta)
    if (idx > 0 && !force && maxDelay > 0) {
      const waitMs = (minDelay + Math.random() * (maxDelay - minDelay)) * 1000;
      if (Date.now() - startedAt + waitMs > TIME_BUDGET_MS) {
        results.push({ id: item.id, status: "deferred", reason: "delay_budget" });
        break;
      }
      await new Promise((r) => setTimeout(r, waitMs));
    }

    // Claim optimist: doar dacă e încă 'pending' (sau 'failed' la force send)
    const { data: claimed } = await supabase
      .from("wa_outbound_queue")
      .update({ status: "sending", attempts: (item.attempts ?? 0) + 1 })
      .eq("id", item.id)
      .in("status", force ? ["pending", "failed"] : ["pending"])

      .select("id")
      .maybeSingle();
    if (!claimed) continue;


    try {
      // Conversație (creează sau refolosește)
      let conversationId = item.conversation_id as string | null;
      if (!conversationId) {
        const { data: conv, error: convErr } = await supabase
          .from("wa_conversations")
          .upsert(
            {
              phone_normalized: item.phone_normalized,
              prospect_id: item.prospect_listing_id,
              status: "active",
              assigned_channel: "whatsapp",
              opened_by_template: item.template_name,
            },
            { onConflict: "phone_normalized" },
          )
          .select("id")
          .single();
        if (convErr) throw convErr;
        conversationId = conv.id;
      }

      const selectedTemplate = item.source === "followup" || item.source === "followup2"
        ? item.template_name
        : item.source === "publish_consent_request"
          ? await preferredPublishConsentTemplate()
          : await preferredIntroTemplate();
      let templateParams = Array.isArray(item.template_params) ? item.template_params : [];
      if (selectedTemplate === WA_PUBLISH_CONSENT_TEMPLATE ||
        (selectedTemplate === "prospect_intro_premium_v6" && (templateParams.length === 0 || item.source === "publish_consent_request"))) {
        const { data: prospect } = item.prospect_listing_id
          ? await supabase
            .from("prospect_listings")
            .select("title, zone")
            .eq("id", item.prospect_listing_id)
            .maybeSingle()
          : { data: null };
        templateParams = selectedTemplate === WA_PUBLISH_CONSENT_TEMPLATE
          ? [consentPropertyLabel(prospect)]
          : [String(prospect?.zone || "Timișoara").trim() || "Timișoara"];
      }

      const send = await fetchWithRetry(
        `${supabaseUrl}/functions/v1/wa-andrei-send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
            "x-internal-secret": internalSecret,
          },
          body: JSON.stringify({
            conversation_id: conversationId,
            // Primul contact folosește șablonul premium aprobat; mesajele de
            // follow-up (sau alte surse cu șablon propriu) își păstrează șablonul,
            // altfel proprietarul ar primi de două ori mesajul de prezentare.
            template_name: selectedTemplate,
            template_language: item.template_language || "ro",
            template_params: templateParams,
          }),
        },
        { label: "wa-outbound-worker", maxAttempts: 3, timeoutMs: 20_000 },
      );

      const attempts = (item.attempts ?? 0) + 1;

      if (send.ok) {
        let waMessageId: string | null = null;
        try {
          waMessageId = JSON.parse(send.body || "{}")?.wa_message_id ?? null;
        } catch { /* ignore */ }

        await supabase
          .from("wa_outbound_queue")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            // Salvăm șablonul efectiv trimis, pentru raportul de eficiență pe șablon.
            template_name: selectedTemplate,
            conversation_id: conversationId,
            wa_message_id: waMessageId,
            last_error: null,
          })
          .eq("id", item.id);


        await supabase.from("communication_logs").insert({
          channel: "whatsapp",
          direction: "outbound",
          source: "wa-outbound-queue",
          to_number: item.phone_normalized,
          prospect_listing_id: item.prospect_listing_id,
          status: "sent",
          outcome: "template_sent",
           metadata: { template: selectedTemplate, attempts },
        });

        // Notifică scenariul Make.com (dacă e configurat webhook-ul).
        // Eșecurile (ex: "Queue is full") se salvează în make_relay_dlq și se reia automat.
        await relayToMake("wa_outbound_sent", {
          queue_id: item.id,
          phone: item.phone_normalized,
          prospect_listing_id: item.prospect_listing_id,
          conversation_id: conversationId,
           template_name: selectedTemplate,
          template_language: item.template_language || "ro",
          wa_message_id: waMessageId,
          queue_source: item.source,
        }, supabase);

        consecutiveFailures = 0;
        results.push({ id: item.id, status: "sent" });
      } else {
        const err = (send.error ?? `http_${send.status}`).slice(0, 500);
        // Eroarea 132001 = șablonul nu există la Meta; reîncercarea nu ajută.
        const permanent = /132001|does not exist in the translation|Template name does not exist|http_404/i.test(err);
        const exhausted = permanent || attempts >= MAX_ATTEMPTS;
        // Backoff la nivel de coadă: 5min, 25min
        const delayMin = attempts === 1 ? 5 : 25;
        await supabase
          .from("wa_outbound_queue")
          .update({
            status: exhausted ? "failed" : "pending",
            last_error: err,
            conversation_id: conversationId,
            scheduled_at: exhausted
              ? new Date().toISOString()
              : new Date(Date.now() + delayMin * 60_000).toISOString(),
          })
          .eq("id", item.id);

        results.push({ id: item.id, status: exhausted ? "failed" : "retry", error: err });
        if (exhausted && !permanent) {
          consecutiveFailures += 1;
          await relayToMake("wa_outbound_failed", {
            queue_id: item.id,
            phone: item.phone_normalized,
            prospect_listing_id: item.prospect_listing_id,
            template_name: item.template_name,
            meta_error: err,
            attempts,
          });
        }
        // Erorile permanente de șablon nu opresc coada, dar NU trebuie să
        // rămână tăcute: le raportăm și alertăm adminii la primul lot.
        if (permanent) {
          permanentFailures += 1;
          await relayToMake("wa_template_invalid", {
            queue_id: item.id,
            phone: item.phone_normalized,
            prospect_listing_id: item.prospect_listing_id,
            template_name: item.template_name,
            meta_error: err,
          });
          if (permanentFailures === 1) {
            try {
              const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
              const rows = (admins ?? []).map((a: { user_id: string }) => ({
                user_id: a.user_id,
                type: "warning",
                title: "Șablon WhatsApp respins de Meta",
                message: `Meta respinge șablonul „${item.template_name}": ${err}. Mesajele cu acest șablon eșuează definitiv — verifică numele și limba în Meta.`,
                action_url: "/admin/whatsapp-queue",
                action_label: "Vezi coada",
              }));
              if (rows.length) await supabase.from("user_notifications").insert(rows);
            } catch (e) {
              console.error("[wa-outbound-worker] template alert failed:", e);
            }
          }
        }
        if (autoPauseEnabled && consecutiveFailures >= maxConsecutiveFailures) {
          await autoPause("consecutive_meta_failures", {
            consecutive_failures: consecutiveFailures,
            threshold: maxConsecutiveFailures,
          });
          break;
        }
      }
    } catch (e) {
      const attempts = (item.attempts ?? 0) + 1;
      const exhausted = attempts >= MAX_ATTEMPTS;
      console.error(`wa-outbound-queue item ${item.id} failed:`, e);
      await supabase
        .from("wa_outbound_queue")
        .update({
          status: exhausted ? "failed" : "pending",
          last_error: String(e).slice(0, 500),
          scheduled_at: new Date(Date.now() + 5 * 60_000).toISOString(),
        })
        .eq("id", item.id);
      results.push({ id: item.id, status: exhausted ? "failed" : "retry", error: String(e) });
    }
  }

  await releaseLock();
  return json({ ok: true, processed: results.length, results, make_relay_retry: makeRelayRetry });
});
