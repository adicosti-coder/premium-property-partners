// lead-score-dispatch — fired by the DB trigger right after a lead is auto-scored.
// 1. Pushes the scored lead to the CRM webhook (Make.com / any CRM endpoint).
// 2. For hot/warm leads: opens (or refreshes) an Andrei WhatsApp conversation so
//    follow-up can start instantly from the Admin inbox, and pings the admin alert
//    webhook.
// Internal-only: requires x-webhook-secret === SUPABASE_SERVICE_ROLE_KEY.
import { createClient } from "npm:@supabase/supabase-js@2";
import { isInternalCall } from "../_shared/cronAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};


interface LeadRecord {
  id: string;
  name: string;
  email?: string | null;
  whatsapp_number?: string | null;
  property_type?: string | null;
  property_area?: number | null;
  calculated_net_profit?: number | null;
  calculated_yearly_profit?: number | null;
  source?: string | null;
  created_at: string;
  lead_score?: number | null;
  lead_grade?: string | null;
  score_breakdown?: Record<string, unknown> | null;
  simulation_data?: Record<string, unknown> | string | null;
  engagement_status?: string | null;
  touch_count?: number | null;
  activity_history?: unknown;
}


/** RO phone → E.164 digits (no plus), or null when unusable. */
function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null;
  let d = raw.replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "40" + d.slice(1);
  if (d.startsWith("7") && d.length === 9) d = "40" + d;
  return /^40[237]\d{8}$/.test(d) ? d : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!(await isInternalCall(req))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }


  let payload: { record?: LeadRecord; event?: string } = {};
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const record = payload.record;
  if (!record?.id) {
    return new Response(JSON.stringify({ error: "record.id required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sim = (typeof record.simulation_data === "string"
    ? (() => {
        try {
          return JSON.parse(record.simulation_data as string);
        } catch {
          return {};
        }
      })()
    : record.simulation_data || {}) as Record<string, unknown>;

  const score = record.lead_score ?? 0;
  const grade = record.lead_grade ?? "cold";
  const phone = normalizePhone(record.whatsapp_number);
  const zone = (sim.zona || sim.zone || sim.city || sim.oras || null) as string | null;
  const campaign = (sim.campaign || sim.utm_campaign || null) as string | null;
  const isReEngaged =
    payload.event === "lead.re_engaged" || record.engagement_status === "re_engaged";
  const touchCount = record.touch_count ?? 1;
  const leadUrl = `https://realtrust.ro/admin?tab=leads&lead=${record.id}`;

  const summary = {
    lead_id: record.id,
    name: record.name,
    phone: phone ? `+${phone}` : record.whatsapp_number ?? null,
    email: record.email ?? null,
    property_type: record.property_type ?? null,
    property_area: record.property_area ?? null,
    zone,
    estimated_net_monthly_eur: record.calculated_net_profit ?? null,
    estimated_net_yearly_eur: record.calculated_yearly_profit ?? null,
    score,
    grade,
    score_breakdown: record.score_breakdown ?? null,
    source: record.source ?? null,
    campaign,
    created_at: record.created_at,
    re_engaged: isReEngaged,
    touch_count: touchCount,
    admin_url: leadUrl,
    wa_url: phone ? `https://wa.me/${phone}` : null,
  };

  /** Structured, readable WhatsApp alert for Andrei / admin. */
  const gradeLabel: Record<string, string> = {
    hot: "🔥 FIERBINTE",
    warm: "⚡ CALD",
    cold: "❄️ RECE",
  };
  const eur = (v?: number | null) =>
    typeof v === "number" ? `${v.toLocaleString("ro-RO")} €` : null;

  const buildAlertMessage = () =>
    [
      isReEngaged
        ? `♻️ *LEAD RE-ENGAGED* (interacțiunea #${touchCount})`
        : `🚨 *LEAD NOU* — RealTrust`,
      `${gradeLabel[grade] ?? grade.toUpperCase()} · scor *${score}/100*`,
      "",
      `👤 *Nume:* ${record.name || "—"}`,
      `📞 *Telefon:* ${phone ? `+${phone}` : record.whatsapp_number || "—"}`,
      record.email ? `✉️ *Email:* ${record.email}` : null,
      zone ? `📍 *Zonă:* ${zone}` : null,
      record.property_type
        ? `🏠 *Proprietate:* ${record.property_type}${
            record.property_area ? ` · ${record.property_area} m²` : ""
          }`
        : null,
      record.calculated_net_profit
        ? `💰 *Venit estimat:* ${eur(record.calculated_net_profit)}/lună${
            record.calculated_yearly_profit
              ? ` (~${eur(record.calculated_yearly_profit)}/an)`
              : ""
          }`
        : null,
      `🔗 *Sursă:* ${record.source ?? "necunoscut"}${campaign ? ` · campanie: ${campaign}` : ""}`,
      "",
      `📋 *Fișa lead:* ${leadUrl}`,
      phone ? `💬 *Scrie pe WhatsApp:* https://wa.me/${phone}` : "⚠️ Fără telefon valid",
    ]
      .filter(Boolean)
      .join("\n");


  const results: Record<string, unknown> = { score, grade };

  // 1) CRM webhook — always, so every lead lands in the pipeline with its score
  const crmUrl = Deno.env.get("LEAD_WEBHOOK_URL") || Deno.env.get("MAKE_WEBHOOK_URL");
  if (crmUrl) {
    try {
      const res = await fetch(crmUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: isReEngaged ? "lead.re_engaged" : "lead.scored",
          ...summary,
        }),

      });
      results.crm = { status: res.status, ok: res.ok };
      if (!res.ok) console.error(`CRM webhook failed [${res.status}]: ${await res.text()}`);
    } catch (e) {
      results.crm = { error: String(e) };
      console.error("CRM webhook error:", e);
    }
  } else {
    results.crm = "skipped: no LEAD_WEBHOOK_URL configured";
  }

  // 2) Hot / warm leads → prepare Andrei's WhatsApp follow-up + alert the admin
  const isPriority = score >= 60;
  if (isPriority && phone) {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    try {
      const { data: conv, error: convErr } = await supabase
        .from("wa_conversations")
        .upsert(
          {
            phone_normalized: `+${phone}`,
            status: "active",
            assigned_channel: "whatsapp",
            qualification_score: score,
            wa_profile_name: record.name,
          },
          { onConflict: "phone_normalized" },
        )
        .select("id")
        .single();

      if (convErr) throw convErr;
      results.conversation_id = conv?.id ?? null;

      if (conv?.id) {
        await supabase.from("wa_messages").insert({
          conversation_id: conv.id,
          direction: "outbound",
          role: "system",
          content:
            (isReEngaged
              ? `Lead re-engaged (interacțiunea #${touchCount}) — scor ${score}/100 (${grade}). `
              : `Lead nou scorat automat: ${score}/100 (${grade}). `) +
            `${record.property_type ?? "proprietate"}${
              record.property_area ? ` · ${record.property_area} m²` : ""
            }${zone ? ` · ${zone}` : ""}` +
            `${record.calculated_net_profit ? ` · estimare ${record.calculated_net_profit} €/lună` : ""}` +
            `${record.source ? ` · sursă: ${record.source}` : ""}`,

        });
      }
    } catch (e) {
      results.whatsapp_conversation = { error: String(e) };
      console.error("wa_conversations upsert failed:", e);
    }

    const alertUrl = Deno.env.get("WHATSAPP_ALERT_WEBHOOK_URL");
    if (alertUrl) {
      const message = buildAlertMessage();


      try {
        const res = await fetch(alertUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, lead: summary }),
        });
        results.alert = { status: res.status, ok: res.ok };
        if (!res.ok) console.error(`Alert webhook failed [${res.status}]: ${await res.text()}`);
      } catch (e) {
        results.alert = { error: String(e) };
        console.error("Alert webhook error:", e);
      }
    } else {
      results.alert = "skipped: no WHATSAPP_ALERT_WEBHOOK_URL configured";
    }
  } else {
    results.whatsapp = isPriority ? "skipped: no valid phone" : "skipped: score below 60";
  }

  return new Response(JSON.stringify({ success: true, ...results }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
