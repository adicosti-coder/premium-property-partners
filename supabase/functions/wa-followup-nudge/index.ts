// wa-followup-nudge — pune în coadă UN SINGUR mesaj de follow-up pentru
// proprietarii care au primit primul mesaj WhatsApp și nu au răspuns.
// Rulează pe cron (automation-orchestrator) sau manual din Admin.
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

  let body: { limit?: number; dry_run?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const dryRun = body.dry_run === true;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: settings } = await supabase
    .from("wa_agent_settings")
    .select(
      "outbound_followup_enabled, outbound_followup_after_hours, outbound_followup_template, outbound_followup_max_per_run, outbound_paused",
    )
    .eq("id", 1)
    .maybeSingle();

  if (settings?.outbound_followup_enabled === false) {
    return json({ ok: true, queued: 0, disabled: true });
  }
  if (settings?.outbound_paused === true) {
    return json({ ok: true, queued: 0, paused: true });
  }

  const afterHours = Math.max(6, Number(settings?.outbound_followup_after_hours ?? 48));
  const template = String(settings?.outbound_followup_template || "andrei_followup_ro");
  const maxPerRun = Math.min(
    50,
    Math.max(1, Number(body.limit ?? settings?.outbound_followup_max_per_run ?? 20)),
  );

  const cutoff = new Date(Date.now() - afterHours * 3_600_000).toISOString();
  // Nu urmărim mesaje mai vechi de 14 zile — lead-ul e deja rece.
  const floor = new Date(Date.now() - 14 * 24 * 3_600_000).toISOString();

  const { data: candidates, error } = await supabase
    .from("wa_outbound_queue")
    .select(
      "id, phone_normalized, prospect_listing_id, lead_id, conversation_id, template_language, template_params, sent_at",
    )
    .eq("status", "sent")
    .is("replied_at", null)
    .neq("source", "followup")
    .lte("sent_at", cutoff)
    .gte("sent_at", floor)
    .order("sent_at", { ascending: true })
    .limit(maxPerRun * 4);

  if (error) return json({ error: error.message }, 500);
  if (!candidates?.length) return json({ ok: true, queued: 0, checked: 0 });

  const results: Record<string, unknown>[] = [];
  let queued = 0;

  for (const item of candidates) {
    if (queued >= maxPerRun) break;
    const phone = item.phone_normalized as string | null;
    if (!phone) continue;

    // 1. Lista de excludere (DNC / agenții / refuzuri)
    const { data: dnc } = await supabase
      .from("wa_dnc_list")
      .select("id")
      .eq("phone_normalized", phone)
      .maybeSingle();
    if (dnc) {
      results.push({ phone, skipped: "dnc" });
      continue;
    }

    // 2. A răspuns între timp? (mesaj inbound în conversație)
    if (item.conversation_id) {
      const { data: conv } = await supabase
        .from("wa_conversations")
        .select("last_inbound_at, status")
        .eq("id", item.conversation_id)
        .maybeSingle();
      if (conv?.last_inbound_at) {
        results.push({ phone, skipped: "replied" });
        continue;
      }
      if (conv?.status && ["closed", "handoff", "opted_out"].includes(conv.status)) {
        results.push({ phone, skipped: `conversation_${conv.status}` });
        continue;
      }
    }

    // 3. Un singur follow-up per număr, oricând
    const { count: existing } = await supabase
      .from("wa_outbound_queue")
      .select("id", { count: "exact", head: true })
      .eq("phone_normalized", phone)
      .eq("source", "followup");
    if ((existing ?? 0) > 0) {
      results.push({ phone, skipped: "already_followed_up" });
      continue;
    }

    if (dryRun) {
      queued += 1;
      results.push({ phone, would_queue: true });
      continue;
    }

    const { error: insErr } = await supabase.from("wa_outbound_queue").insert({
      phone_normalized: phone,
      prospect_listing_id: item.prospect_listing_id,
      lead_id: item.lead_id,
      conversation_id: item.conversation_id,
      template_name: template,
      template_language: item.template_language || "ro",
      template_params: Array.isArray(item.template_params) ? item.template_params : [],
      status: "pending",
      source: "followup",
      priority: 0,
      scheduled_at: new Date().toISOString(),
    });

    if (insErr) {
      results.push({ phone, error: insErr.message });
      continue;
    }

    queued += 1;
    results.push({ phone, queued: true });
  }

  console.log(`[wa-followup-nudge] checked=${candidates.length} queued=${queued}`);

  return json({
    ok: true,
    checked: candidates.length,
    queued,
    dry_run: dryRun,
    template,
    after_hours: afterHours,
    results: results.slice(0, 50),
  });
});
