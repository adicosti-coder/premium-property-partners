// wa-auto-offer — trimite automat mesajul de ofertă (cu pașii următori) în
// discuțiile în care s-a ales deja un apartament, dar agentul nu a continuat
// discuția în ultimele N ore. Astfel discuția nu se oprește dacă agentul
// nu răspunde.
//
// Acces: apel intern (x-cron-secret / service role) sau Admin JWT.
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { isInternalCall } from "../_shared/cronAuth.ts";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (!(await isInternalCall(req))) {
    const auth = await requireAdmin(req, corsHeaders);
    if (!auth.ok) return auth.response!;
  }

  let body: {
    limit?: number;
    dry_run?: boolean;
    after_hours?: number;
    conversation_id?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const dryRun = body.dry_run === true;
  const limit = Math.min(25, Math.max(1, Number(body.limit ?? 10)));
  const afterHours = Math.min(72, Math.max(1, Number(body.after_hours ?? 3)));
  const cutoff = new Date(Date.now() - afterHours * 3_600_000).toISOString();
  const floor = new Date(Date.now() - 14 * 24 * 3_600_000).toISOString();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Apartamente alese, cele mai recente primele.
  let q = supabase
    .from("wa_transaction_events")
    .select("id, conversation_id, phone_normalized, agent_id, property_id, created_at, event")
    .eq("event", "offer_sent")
    .not("property_id", "is", null)
    .gte("created_at", floor)
    .lte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(limit * 6);
  if (body.conversation_id) q = q.eq("conversation_id", body.conversation_id);

  const { data: chosen, error } = await q;
  if (error) return json({ error: error.message }, 500);
  if (!chosen?.length) return json({ ok: true, sent: 0, checked: 0 });

  const results: Record<string, unknown>[] = [];
  let sent = 0;
  const seen = new Set<string>();

  for (const ev of chosen) {
    if (sent >= limit) break;
    const conversationId = ev.conversation_id as string | null;
    const phone = ev.phone_normalized as string | null;
    if (!conversationId || !phone || seen.has(conversationId)) continue;
    seen.add(conversationId);

    // 1. DNC — refuzul clientului blochează orice canal.
    const { data: dnc } = await supabase
      .from("wa_dnc_list")
      .select("id")
      .eq("phone_normalized", phone)
      .maybeSingle();
    if (dnc) {
      results.push({ conversationId, skipped: "dnc" });
      continue;
    }

    // 2. Oferta a fost deja trimisă (sau s-a intrat în negociere)?
    const { count: already } = await supabase
      .from("wa_transaction_events")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversationId)
      .in("event", ["offer_followup", "negotiation"]);
    if ((already ?? 0) > 0) {
      results.push({ conversationId, skipped: "offer_already_sent" });
      continue;
    }

    // 3. Discuția închisă / handoff / opt-out?
    const { data: conv } = await supabase
      .from("wa_conversations")
      .select("id, status, assigned_agent_id")
      .eq("id", conversationId)
      .maybeSingle();
    if (conv?.status && ["closed", "opted_out"].includes(String(conv.status))) {
      results.push({ conversationId, skipped: `conversation_${conv.status}` });
      continue;
    }

    // 4. Agentul a scris deja în ultimele `afterHours` ore? Îl lăsăm pe el.
    const { data: recentOut } = await supabase
      .from("wa_messages")
      .select("id, created_at")
      .eq("conversation_id", conversationId)
      .eq("direction", "outbound")
      .gt("created_at", cutoff)
      .limit(1);
    if (recentOut?.length) {
      results.push({ conversationId, skipped: "agent_active" });
      continue;
    }

    if (dryRun) {
      sent += 1;
      results.push({ conversationId, phone, would_send: true });
      continue;
    }

    // 5. Trimite oferta prin bridge (aceeași logică folosită în Admin).
    try {
      const res = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/make-agent-bridge`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-webhook-secret": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
          },
          body: JSON.stringify({
            action: "offer_followup",
            conversation_id: conversationId,
            phone,
            property_id: ev.property_id,
          }),
        },
      );
      const payload = await res.json().catch(() => ({}));
      if (res.ok && payload?.ok !== false) {
        sent += 1;
        results.push({ conversationId, phone, sent: true });
      } else {
        results.push({ conversationId, phone, error: payload?.error || `http_${res.status}` });
      }
    } catch (e) {
      results.push({ conversationId, phone, error: String(e) });
    }
  }

  // ---------------------------------------------------------------------------
  // Pasul 2: după ofertă, confirmă livrarea și cheamă clientul la vizionare și
  // negociere, dacă agentul nu a mai scris nimic între timp.
  // ---------------------------------------------------------------------------
  const confirmCutoff = new Date(Date.now() - 3_600_000).toISOString();
  let confirmed = 0;

  let cq = supabase
    .from("wa_transaction_events")
    .select("id, conversation_id, phone_normalized, property_id, created_at")
    .eq("event", "offer_followup")
    .neq("status", "failed")
    .gte("created_at", floor)
    .lte("created_at", confirmCutoff)
    .order("created_at", { ascending: false })
    .limit(limit * 6);
  if (body.conversation_id) cq = cq.eq("conversation_id", body.conversation_id);

  const { data: offered } = await cq;
  const seenConfirm = new Set<string>();

  for (const ev of offered ?? []) {
    if (confirmed >= limit) break;
    const conversationId = ev.conversation_id as string | null;
    const phone = ev.phone_normalized as string | null;
    if (!conversationId || !phone || seenConfirm.has(conversationId)) continue;
    seenConfirm.add(conversationId);

    const { data: dnc } = await supabase
      .from("wa_dnc_list")
      .select("id")
      .eq("phone_normalized", phone)
      .maybeSingle();
    if (dnc) {
      results.push({ conversationId, step: "offer_confirm", skipped: "dnc" });
      continue;
    }

    const { count: alreadyConfirmed } = await supabase
      .from("wa_transaction_events")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversationId)
      .eq("event", "offer_confirm");
    if ((alreadyConfirmed ?? 0) > 0) {
      results.push({ conversationId, step: "offer_confirm", skipped: "already_confirmed" });
      continue;
    }

    const { data: conv } = await supabase
      .from("wa_conversations")
      .select("id, status")
      .eq("id", conversationId)
      .maybeSingle();
    if (conv?.status && ["closed", "opted_out"].includes(String(conv.status))) {
      results.push({ conversationId, step: "offer_confirm", skipped: `conversation_${conv.status}` });
      continue;
    }

    // Agentul a scris după ofertă? Îl lăsăm pe el să continue.
    const { data: outAfter } = await supabase
      .from("wa_messages")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("direction", "outbound")
      .gt("created_at", ev.created_at as string)
      .limit(1);
    if (outAfter?.length) {
      results.push({ conversationId, step: "offer_confirm", skipped: "agent_active" });
      continue;
    }

    if (dryRun) {
      confirmed += 1;
      results.push({ conversationId, step: "offer_confirm", would_send: true });
      continue;
    }

    try {
      const res = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/make-agent-bridge`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-webhook-secret": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
          },
          body: JSON.stringify({
            action: "offer_confirm",
            conversation_id: conversationId,
            phone,
            property_id: ev.property_id,
          }),
        },
      );
      const payload = await res.json().catch(() => ({}));
      if (res.ok && payload?.ok !== false) {
        confirmed += 1;
        results.push({ conversationId, step: "offer_confirm", sent: true });
      } else {
        results.push({
          conversationId,
          step: "offer_confirm",
          error: payload?.error || `http_${res.status}`,
        });
      }
    } catch (e) {
      results.push({ conversationId, step: "offer_confirm", error: String(e) });
    }
  }

  // ---------------------------------------------------------------------------
  // Pașii 3 și 4: după confirmarea ofertei propune un punct de întâlnire pentru
  // vizionare și negociere, apoi anunță clientul că poate scrie oricând direct
  // pe WhatsApp (cu linkul chatului) — doar dacă agentul nu a mai scris.
  // ---------------------------------------------------------------------------
  const followStages: { after: string; next: string; delayMs: number }[] = [
    { after: "offer_confirm", next: "offer_meeting", delayMs: 2 * 3_600_000 },
    { after: "offer_meeting", next: "offer_direct_chat", delayMs: 3 * 3_600_000 },
  ];
  const followCounts: Record<string, number> = {};

  for (const stage of followStages) {
    const stageCutoff = new Date(Date.now() - stage.delayMs).toISOString();
    let done = 0;

    let sq = supabase
      .from("wa_transaction_events")
      .select("id, conversation_id, phone_normalized, property_id, created_at")
      .eq("event", stage.after)
      .neq("status", "failed")
      .gte("created_at", floor)
      .lte("created_at", stageCutoff)
      .order("created_at", { ascending: false })
      .limit(limit * 6);
    if (body.conversation_id) sq = sq.eq("conversation_id", body.conversation_id);

    const { data: prev } = await sq;
    const seenStage = new Set<string>();

    for (const ev of prev ?? []) {
      if (done >= limit) break;
      const conversationId = ev.conversation_id as string | null;
      const phone = ev.phone_normalized as string | null;
      if (!conversationId || !phone || seenStage.has(conversationId)) continue;
      seenStage.add(conversationId);

      const { data: dnc } = await supabase
        .from("wa_dnc_list")
        .select("id")
        .eq("phone_normalized", phone)
        .maybeSingle();
      if (dnc) {
        results.push({ conversationId, step: stage.next, skipped: "dnc" });
        continue;
      }

      const { count: already } = await supabase
        .from("wa_transaction_events")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conversationId)
        .eq("event", stage.next);
      if ((already ?? 0) > 0) {
        results.push({ conversationId, step: stage.next, skipped: "already_sent" });
        continue;
      }

      const { data: conv } = await supabase
        .from("wa_conversations")
        .select("id, status")
        .eq("id", conversationId)
        .maybeSingle();
      if (conv?.status && ["closed", "opted_out"].includes(String(conv.status))) {
        results.push({ conversationId, step: stage.next, skipped: `conversation_${conv.status}` });
        continue;
      }

      const { data: outAfter } = await supabase
        .from("wa_messages")
        .select("id")
        .eq("conversation_id", conversationId)
        .eq("direction", "outbound")
        .gt("created_at", ev.created_at as string)
        .limit(1);
      if (outAfter?.length) {
        results.push({ conversationId, step: stage.next, skipped: "agent_active" });
        continue;
      }

      if (dryRun) {
        done += 1;
        results.push({ conversationId, step: stage.next, would_send: true });
        continue;
      }

      try {
        const res = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/make-agent-bridge`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-webhook-secret": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
            },
            body: JSON.stringify({
              action: stage.next,
              conversation_id: conversationId,
              phone,
              property_id: ev.property_id,
            }),
          },
        );
        const payload = await res.json().catch(() => ({}));
        if (res.ok && payload?.ok !== false) {
          done += 1;
          results.push({ conversationId, step: stage.next, sent: true });
        } else {
          results.push({
            conversationId,
            step: stage.next,
            error: payload?.error || `http_${res.status}`,
          });
        }
      } catch (e) {
        results.push({ conversationId, step: stage.next, error: String(e) });
      }
    }

    followCounts[stage.next] = done;
  }

  console.log(
    `[wa-auto-offer] checked=${chosen.length} sent=${sent} confirmed=${confirmed} meeting=${followCounts.offer_meeting ?? 0} direct_chat=${followCounts.offer_direct_chat ?? 0} after_hours=${afterHours}`,
  );

  return json({
    ok: true,
    checked: chosen.length,
    sent,
    confirmed,
    meeting: followCounts.offer_meeting ?? 0,
    direct_chat: followCounts.offer_direct_chat ?? 0,
    dry_run: dryRun,
    after_hours: afterHours,
    results: results.slice(0, 120),
  });
});

