// wa-followup-nudge — pune în coadă UN SINGUR mesaj de follow-up pentru
// proprietarii care au primit primul mesaj WhatsApp și nu au răspuns.
// Rulează pe cron (automation-orchestrator) sau manual din Admin.
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { isInternalCall } from "../_shared/cronAuth.ts";
import { resolveApprovedTemplate } from "../_shared/waPreferredTemplate.ts";

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

  // Două etape de memento: 24h după primul mesaj, apoi 72h (încă 48h) dacă tot nu răspunde.
  const stage1Hours = Math.max(6, Number(settings?.outbound_followup_after_hours ?? 24));
  const stage2Hours = 72;
  const configuredTemplate = String(settings?.outbound_followup_template || "andrei_followup_ro");
  // Dacă șablonul configurat nu e aprobat în română, folosim unul aprobat —
  // altfel Meta respinge fiecare mesaj cu eroarea 132001 și coada se blochează.
  const resolved = await resolveApprovedTemplate(configuredTemplate, "ro");
  const template = resolved.name;
  if (resolved.fallback) {
    console.warn(
      `[wa-followup-nudge] template "${configuredTemplate}" nu e aprobat în ro — folosesc "${template}"`,
    );
  }
  const maxPerRun = Math.min(
    50,
    Math.max(1, Number(body.limit ?? settings?.outbound_followup_max_per_run ?? 20)),
  );

  // Nu urmărim mesaje mai vechi de 14 zile — lead-ul e deja rece.
  const floor = new Date(Date.now() - 14 * 24 * 3_600_000).toISOString();

  interface Stage {
    source: "followup" | "followup2";
    /** Ore scurse de la PRIMUL mesaj până la acest memento. */
    hoursSinceFirst: number;
    /** Din ce fel de mesaj pornim: originalul sau mementoul de 24h. */
    from: "initial" | "followup";
  }

  const stages: Stage[] = [
    { source: "followup", hoursSinceFirst: stage1Hours, from: "initial" },
    { source: "followup2", hoursSinceFirst: stage2Hours, from: "followup" },
  ];

  const results: Record<string, unknown>[] = [];
  let queued = 0;
  let checked = 0;
  const perStage: Record<string, number> = { followup: 0, followup2: 0 };

  for (const stage of stages) {
    if (queued >= maxPerRun) break;

    // Pentru etapa 2 măsurăm de la mementoul de 24h, deci mai așteptăm diferența.
    const waitHours = stage.from === "initial" ? stage.hoursSinceFirst : stage.hoursSinceFirst - stage1Hours;
    const cutoff = new Date(Date.now() - Math.max(1, waitHours) * 3_600_000).toISOString();

    let query = supabase
      .from("wa_outbound_queue")
      .select(
        "id, phone_normalized, prospect_listing_id, lead_id, conversation_id, template_language, template_params, sent_at",
      )
      .eq("status", "sent")
      .is("replied_at", null)
      .lte("sent_at", cutoff)
      .gte("sent_at", floor)
      .order("sent_at", { ascending: true })
      .limit(maxPerRun * 4);

    query = stage.from === "initial"
      ? query.not("source", "in", "(followup,followup2)")
      : query.eq("source", "followup");

    const { data: candidates, error } = await query;
    if (error) return json({ error: error.message }, 500);
    if (!candidates?.length) continue;
    checked += candidates.length;

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
        results.push({ phone, stage: stage.source, skipped: "dnc" });
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
          results.push({ phone, stage: stage.source, skipped: "replied" });
          continue;
        }
        if (conv?.status && ["closed", "handoff", "opted_out"].includes(conv.status)) {
          results.push({ phone, stage: stage.source, skipped: `conversation_${conv.status}` });
          continue;
        }
      }

      // 3. Un singur memento per etapă și per număr — niciodată mai mult de două în total.
      const { count: existing } = await supabase
        .from("wa_outbound_queue")
        .select("id", { count: "exact", head: true })
        .eq("phone_normalized", phone)
        .eq("source", stage.source);
      if ((existing ?? 0) > 0) {
        results.push({ phone, stage: stage.source, skipped: "already_sent_this_stage" });
        continue;
      }

      if (dryRun) {
        queued += 1;
        perStage[stage.source] += 1;
        results.push({ phone, stage: stage.source, would_queue: true });
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
        source: stage.source,
        priority: 0,
        scheduled_at: new Date().toISOString(),
      });

      if (insErr) {
        results.push({ phone, stage: stage.source, error: insErr.message });
        continue;
      }

      queued += 1;
      perStage[stage.source] += 1;
      results.push({ phone, stage: stage.source, queued: true });
    }
  }

  console.log(
    `[wa-followup-nudge] checked=${checked} queued=${queued} stage24h=${perStage.followup} stage72h=${perStage.followup2}`,
  );

  return json({
    ok: true,
    checked,
    queued,
    queued_24h: perStage.followup,
    queued_72h: perStage.followup2,
    dry_run: dryRun,
    template,
    template_configured: configuredTemplate,
    template_fallback: resolved.fallback,
    stage1_after_hours: stage1Hours,
    stage2_after_hours: stage2Hours,
    results: results.slice(0, 50),
  });
});
