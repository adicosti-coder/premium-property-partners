import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/* ──────────────────────────────────────────────────────────────
   Auto-Dial — reads from prospect_listings (lead_score>80, status=new).
   Triggered by:
     - cron (no body) → dials top eligible lead
     - DB trigger ({triggered_prospect_id}) → dials that prospect
     - Manual UI ({prospect_id, manual:true}) → bypasses quota
     - "Resume pending" UI ({resume_pending:true}) → re-tries pending_credentials queue

   SAFE-CHECK: if Twilio creds missing, prospect is marked
   `pending_credentials`, an admin notification is created, and
   (optionally) MAKE_WEBHOOK_URL receives the lead so WhatsApp can
   be sent manually until Twilio is wired up. NO 5xx error is thrown.
─────────────────────────────────────────────────────────────── */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function notifyAdmins(supabase: any, title: string, message: string, actionLabel = "Vezi prospecte") {
  try {
    const { data: admins } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    if (!admins?.length) return;

    const rows = admins.map((a: any) => ({
      user_id: a.user_id,
      title,
      message,
      type: "warning",
      action_url: "/admin/prospect-listings",
      action_label: actionLabel,
    }));
    await supabase.from("user_notifications").insert(rows);
  } catch (e) {
    console.warn("notifyAdmins failed (non-fatal):", (e as Error).message);
  }
}

async function postToMakeWebhook(prospect: any, reason: string) {
  const MAKE_WEBHOOK_URL = Deno.env.get("MAKE_WEBHOOK_URL");
  if (!MAKE_WEBHOOK_URL) return { sent: false, reason: "MAKE_WEBHOOK_URL not set" };
  try {
    const res = await fetch(MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "prospect_pending_call",
        reason,
        prospect: {
          id: prospect.id,
          title: prospect.title,
          phone: prospect.phone_normalized || prospect.contact_phone,
          contact_name: prospect.contact_name,
          location: prospect.location,
          zone: prospect.zone,
          price: prospect.price,
          currency: prospect.currency,
          lead_score: prospect.lead_score,
          owner_sentiment: prospect.ai_score_breakdown?.owner_sentiment,
          urgency_level: prospect.ai_score_breakdown?.urgency_level,
          recommended_pitch: prospect.ai_score_breakdown?.recommended_pitch,
          source_url: prospect.source_url,
        },
        timestamp: new Date().toISOString(),
      }),
    });
    return { sent: res.ok, status: res.status };
  } catch (e) {
    return { sent: false, reason: (e as Error).message };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    const TWILIO_FROM_NUMBER = Deno.env.get("TWILIO_FROM_NUMBER");

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json().catch(() => ({}));
    const triggeredId: string | undefined = body.triggered_prospect_id || body.prospect_id;
    const manual = body.manual === true;
    const resumePending = body.resume_pending === true;

    // Settings
    const { data: settings } = await supabase
      .from("voice_agent_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (!manual && !resumePending && (!settings || !settings.auto_dial_enabled)) {
      return jsonResp({ skipped: "auto_dial disabled" });
    }

    // Time window check (Romania UTC+2)
    if (!manual && !resumePending && settings) {
      const nowUtc = new Date();
      const hourRo = (nowUtc.getUTCHours() + 2) % 24;
      if (hourRo < settings.allowed_hours_start || hourRo >= settings.allowed_hours_end) {
        return jsonResp({ skipped: `outside hours (RO hour ${hourRo})` });
      }
    }

    // ── SAFE-CHECK: Twilio credentials present? ──────────────
    const twilioReady = !!(LOVABLE_API_KEY && TWILIO_API_KEY && TWILIO_FROM_NUMBER);

    // Resolve prospect to call
    let prospect: any = null;
    if (triggeredId) {
      const { data } = await supabase
        .from("prospect_listings")
        .select("id, title, category, prospect_type, contact_name, contact_phone, phone_normalized, price, currency, location, zone, lead_score, ai_score_breakdown, source_url")
        .eq("id", triggeredId)
        .maybeSingle();
      prospect = data;
    } else if (resumePending) {
      // Pick top pending_credentials prospect
      const { data: leads } = await supabase
        .from("prospect_listings")
        .select("id, title, category, prospect_type, contact_name, contact_phone, phone_normalized, price, currency, location, zone, lead_score, ai_score_breakdown, source_url")
        .eq("lifecycle_status", "pending_credentials" as any)
        .order("lead_score", { ascending: false })
        .limit(1);
      prospect = leads?.[0];
    } else {
      const minScore = (settings?.min_lead_score ?? 81);
      const { data: leads } = await supabase
        .from("prospect_listings")
        .select("id, title, category, prospect_type, contact_name, contact_phone, phone_normalized, price, currency, location, zone, lead_score, ai_score_breakdown, source_url")
        .gt("lead_score", Math.max(80, minScore - 1))
        .eq("lifecycle_status", "new")
        .not("phone_normalized", "is", null)
        .is("auto_call_triggered_at", null)
        .order("lead_score", { ascending: false })
        .limit(1);
      prospect = leads?.[0];
    }

    if (!prospect) {
      return jsonResp({ skipped: "no eligible prospect" });
    }

    // ── If Twilio missing → mark pending_credentials, alert admins, fire MAKE webhook ──
    if (!twilioReady) {
      const reason = `Missing Twilio secrets (LOVABLE_API_KEY=${!!LOVABLE_API_KEY}, TWILIO_API_KEY=${!!TWILIO_API_KEY}, TWILIO_FROM_NUMBER=${!!TWILIO_FROM_NUMBER})`;
      console.log(`[Safe-Check] ${reason} — prospect ${prospect.id} marked pending_credentials`);

      await supabase
        .from("prospect_listings")
        .update({
          lifecycle_status: "pending_credentials" as any,
          admin_notes: `[Safe-Check] ${new Date().toISOString()} — Twilio nu este configurat. Apel suspendat. ${prospect.admin_notes || ""}`.slice(0, 1000),
        })
        .eq("id", prospect.id);

      // Webhook MAKE (best-effort, non-blocking errors)
      const makeResult = await postToMakeWebhook(prospect, "twilio_not_configured");

      // Single batched admin notification (avoid spam)
      const lastAlertKey = "twilio_pending_alert";
      const { data: recentAlert } = await supabase
        .from("user_notifications")
        .select("created_at")
        .eq("title", "🔧 Apeluri AI suspendate — lipsesc cheile Twilio")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const recentEnough = recentAlert &&
        (Date.now() - new Date(recentAlert.created_at).getTime()) < 6 * 60 * 60 * 1000;

      if (!recentEnough) {
        await notifyAdmins(
          supabase,
          "🔧 Apeluri AI suspendate — lipsesc cheile Twilio",
          `Lead-ul "${(prospect.title || "").slice(0, 60)}" (scor ${prospect.lead_score}) este în coadă. Configurează TWILIO_API_KEY și TWILIO_FROM_NUMBER pentru a relua apelurile automate.`,
          "Vezi coada"
        );
      }

      return jsonResp({
        skipped: "pending_credentials",
        reason,
        prospect_id: prospect.id,
        make_webhook: makeResult,
      });
    }

    // ── Daily quota check (only when actually dialing) ──
    if (!manual && settings) {
      const startOfDay = new Date(); startOfDay.setUTCHours(0, 0, 0, 0);
      const { count: callsToday } = await supabase
        .from("voice_call_sessions")
        .select("*", { count: "exact", head: true })
        .eq("direction", "outbound")
        .gte("created_at", startOfDay.toISOString());
      if ((callsToday || 0) >= settings.max_calls_per_day) {
        return jsonResp({ skipped: `daily quota reached (${callsToday})` });
      }
    }

    const toNumber = prospect.phone_normalized || prospect.contact_phone;
    if (!toNumber || !/^\+[1-9]\d{6,14}$/.test(toNumber)) {
      await supabase.from("prospect_listings").update({
        lifecycle_status: "rejected",
        admin_notes: `Auto-dial: invalid phone "${prospect.contact_phone}"`,
      }).eq("id", prospect.id);
      return jsonResp({ skipped: `invalid phone: ${prospect.contact_phone}` });
    }

    // Mark as calling (idempotent)
    await supabase.from("prospect_listings").update({
      lifecycle_status: "calling",
      auto_call_triggered_at: new Date().toISOString(),
    }).eq("id", prospect.id);

    const { data: session, error: sessErr } = await supabase
      .from("voice_call_sessions")
      .insert({
        to_number: toNumber,
        from_number: TWILIO_FROM_NUMBER,
        prospect_listing_id: prospect.id,
        status: "initiating",
        call_objective: settings?.default_objective || "qualify",
        direction: "outbound",
      })
      .select()
      .single();
    if (sessErr || !session) throw new Error(`DB insert: ${sessErr?.message}`);

    await supabase.from("prospect_listings").update({
      voice_call_session_id: session.id,
    }).eq("id", prospect.id);

    const twimlUrl = `${SUPABASE_URL}/functions/v1/voice-agent-twiml?sessionId=${session.id}`;
    const statusUrl = `${SUPABASE_URL}/functions/v1/voice-agent-status?sessionId=${session.id}`;

    const twRes = await fetch(`https://connector-gateway.lovable.dev/twilio/Calls.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY!,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: toNumber,
        From: TWILIO_FROM_NUMBER!,
        Url: twimlUrl,
        StatusCallback: statusUrl,
        StatusCallbackEvent: "initiated ringing answered completed",
        Record: "true",
        RecordingStatusCallback: statusUrl,
      }),
    });
    const twData = await twRes.json();

    if (!twRes.ok) {
      await supabase.from("voice_call_sessions").update({
        status: "failed",
        error_message: `Twilio ${twRes.status}: ${JSON.stringify(twData).slice(0, 500)}`,
        ended_at: new Date().toISOString(),
      }).eq("id", session.id);
      await supabase.from("prospect_listings").update({
        lifecycle_status: "new",
        auto_call_triggered_at: null,
        admin_notes: `Twilio failed: ${JSON.stringify(twData).slice(0, 200)}`,
      }).eq("id", prospect.id);
      return jsonResp({ error: "Twilio failed", details: twData }, twRes.status);
    }

    await supabase.from("voice_call_sessions").update({
      twilio_call_sid: twData.sid,
      status: "queued",
      started_at: new Date().toISOString(),
    }).eq("id", session.id);

    return jsonResp({
      success: true,
      prospect_id: prospect.id,
      lead_score: prospect.lead_score,
      category: prospect.category,
      to: toNumber,
      session_id: session.id,
    });
  } catch (e: any) {
    console.error("voice-agent-auto-dial error:", e);
    return jsonResp({ error: e.message }, 500);
  }
});
