import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/* ──────────────────────────────────────────────────────────────
   Auto-Dial cron — rulează periodic (ex: la 15 min) și sună
   automat lead-urile cu scor mare care n-au fost încă apelate.
─────────────────────────────────────────────────────────────── */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    const TWILIO_FROM_NUMBER = Deno.env.get("TWILIO_FROM_NUMBER");

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Load settings
    const { data: settings } = await supabase
      .from("voice_agent_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (!settings || !settings.auto_dial_enabled) {
      return new Response(JSON.stringify({ skipped: "auto_dial disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Time window check (Romania timezone: UTC+2/+3, simplified UTC+2)
    const nowUtc = new Date();
    const hourRo = (nowUtc.getUTCHours() + 2) % 24;
    if (hourRo < settings.allowed_hours_start || hourRo >= settings.allowed_hours_end) {
      return new Response(JSON.stringify({ skipped: `outside hours (RO hour ${hourRo})` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!LOVABLE_API_KEY || !TWILIO_API_KEY || !TWILIO_FROM_NUMBER) {
      return new Response(JSON.stringify({ error: "Twilio not configured" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Daily quota check
    const startOfDay = new Date(); startOfDay.setUTCHours(0, 0, 0, 0);
    const { count: callsToday } = await supabase
      .from("voice_call_sessions")
      .select("*", { count: "exact", head: true })
      .eq("direction", "outbound")
      .gte("created_at", startOfDay.toISOString());

    if ((callsToday || 0) >= settings.max_calls_per_day) {
      return new Response(JSON.stringify({ skipped: `daily quota reached (${callsToday})` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find eligible leads: high score, has phone, not yet called
    const { data: leads } = await supabase
      .from("scraper_leads")
      .select("id, title, listing_type, prospect_category, agency_name, phone, original_price, city, lead_score")
      .gte("lead_score", settings.min_lead_score)
      .not("phone", "is", null)
      .order("lead_score", { ascending: false })
      .limit(10);

    if (!leads || leads.length === 0) {
      return new Response(JSON.stringify({ skipped: "no eligible leads" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter out already-called leads
    const leadIds = leads.map((l: any) => l.id);
    const { data: already } = await supabase
      .from("voice_call_sessions")
      .select("scraper_lead_id")
      .in("scraper_lead_id", leadIds);
    const calledSet = new Set((already || []).map((a: any) => a.scraper_lead_id));
    const fresh = leads.filter((l: any) => !calledSet.has(l.id));

    if (fresh.length === 0) {
      return new Response(JSON.stringify({ skipped: "all top leads already called" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Take 1 lead per cron run (gentle pacing)
    const lead = fresh[0];
    const phoneRaw = (lead.phone || "").replace(/[\s\-()]/g, "");
    const toNumber = phoneRaw.startsWith("+") ? phoneRaw : phoneRaw.startsWith("0") ? "+4" + phoneRaw : "+40" + phoneRaw;
    if (!/^\+[1-9]\d{6,14}$/.test(toNumber)) {
      return new Response(JSON.stringify({ skipped: `invalid phone for lead ${lead.id}: ${lead.phone}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create session
    const { data: session, error: sessErr } = await supabase
      .from("voice_call_sessions")
      .insert({
        to_number: toNumber,
        from_number: TWILIO_FROM_NUMBER,
        scraper_lead_id: lead.id,
        status: "initiating",
        call_objective: settings.default_objective,
        direction: "outbound",
      })
      .select()
      .single();
    if (sessErr || !session) throw new Error(`DB insert: ${sessErr?.message}`);

    const twimlUrl = `${SUPABASE_URL}/functions/v1/voice-agent-twiml?sessionId=${session.id}`;
    const statusUrl = `${SUPABASE_URL}/functions/v1/voice-agent-status?sessionId=${session.id}`;

    const twRes = await fetch(`https://connector-gateway.lovable.dev/twilio/Calls.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: toNumber, From: TWILIO_FROM_NUMBER, Url: twimlUrl,
        StatusCallback: statusUrl,
        StatusCallbackEvent: "initiated ringing answered completed",
        Record: "true", RecordingStatusCallback: statusUrl,
      }),
    });
    const twData = await twRes.json();

    if (!twRes.ok) {
      await supabase.from("voice_call_sessions").update({
        status: "failed",
        error_message: `Twilio ${twRes.status}: ${JSON.stringify(twData).slice(0, 500)}`,
        ended_at: new Date().toISOString(),
      }).eq("id", session.id);
      return new Response(JSON.stringify({ error: "Twilio failed", details: twData }), {
        status: twRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("voice_call_sessions").update({
      twilio_call_sid: twData.sid,
      status: "queued",
      started_at: new Date().toISOString(),
    }).eq("id", session.id);

    return new Response(JSON.stringify({
      success: true,
      called_lead_id: lead.id,
      lead_score: lead.lead_score,
      to: toNumber,
      session_id: session.id,
      remaining_quota: settings.max_calls_per_day - (callsToday || 0) - 1,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("voice-agent-auto-dial error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
