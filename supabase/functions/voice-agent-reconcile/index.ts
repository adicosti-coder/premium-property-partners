import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";
const ACTIVE_STATUSES = ["initiating", "queued", "ringing", "answered", "in-progress", "in_progress", "completing"];
const FINAL_STATUSES = ["completed", "failed", "busy", "no-answer", "canceled"];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const parseTwilioDate = (value: unknown): string | null => {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

const appendDebug = (existing: unknown, entry: Record<string, unknown>) => {
  const current = Array.isArray(existing) ? existing : [];
  return [...current, { at: new Date().toISOString(), ...entry }].slice(-100);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");

    if (!LOVABLE_API_KEY || !TWILIO_API_KEY) {
      return json({ error: "Twilio connector is not configured" }, 400);
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Auth required" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const isInternal = token === SERVICE_KEY;
    if (!isInternal) {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) return json({ error: "Invalid token" }, 401);

      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!isAdmin) return json({ error: "Admin required" }, 403);
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const sessionIds = Array.isArray(body?.sessionIds)
      ? body.sessionIds.filter((id: unknown) => typeof id === "string" && id.length > 0).slice(0, 25)
      : [];
    const staleSeconds = Math.max(15, Math.min(600, Number(body?.staleSeconds ?? 45)));
    const limit = Math.max(1, Math.min(25, Number(body?.limit ?? 10)));
    const staleBefore = new Date(Date.now() - staleSeconds * 1000).toISOString();

    let query = supabase
      .from("voice_call_sessions")
      .select("id, to_number, status, twilio_call_sid, call_duration_seconds, started_at, ended_at, ai_summary, ai_outcome, ai_sentiment, next_action, debug_log")
      .not("twilio_call_sid", "is", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (sessionIds.length) {
      query = query.in("id", sessionIds);
    } else {
      query = query.in("status", ACTIVE_STATUSES).lt("started_at", staleBefore);
    }

    const { data: sessions, error } = await query;
    if (error) throw error;

    const reconciled: Array<Record<string, unknown>> = [];

    for (const session of sessions || []) {
      const sid = (session as any).twilio_call_sid;
      const twRes = await fetch(`${GATEWAY_URL}/Calls/${sid}.json`, {
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": TWILIO_API_KEY,
        },
      });

      if (!twRes.ok) {
        reconciled.push({ id: (session as any).id, ok: false, error: `Twilio ${twRes.status}` });
        continue;
      }

      const twData = await twRes.json();
      const twStatus = String(twData.status || "unknown");
      const duration = Number.parseInt(String(twData.duration || "0"), 10) || 0;
      const endedAt = parseTwilioDate(twData.end_time);
      const updates: Record<string, unknown> = {
        debug_log: appendDebug((session as any).debug_log, {
          stage: "twilio_reconcile",
          twilio_status: twStatus,
          duration,
          ended_at: endedAt,
        }),
      };

      if (FINAL_STATUSES.includes(twStatus)) {
        updates.status = twStatus;
        updates.call_duration_seconds = duration;
        updates.ended_at = endedAt || new Date().toISOString();
        if (!(session as any).ai_summary) {
          const noConnection = duration === 0 || ["failed", "busy", "no-answer", "canceled"].includes(twStatus);
          updates.ai_outcome = (session as any).ai_outcome || "nicio_legatura";
          updates.ai_sentiment = (session as any).ai_sentiment || "neutru";
          updates.ai_summary = noConnection
            ? `Apel încheiat de Twilio cu status ${twStatus}, fără conversație utilă.`
            : `Apel încheiat de Twilio cu status ${twStatus}.`;
          updates.next_action = (session as any).next_action || "Verifică numărul sau reia testul dacă este necesar.";
        }
      } else if (twStatus && twStatus !== (session as any).status) {
        updates.status = twStatus;
      }

      await supabase.from("voice_call_sessions").update(updates).eq("id", (session as any).id);
      reconciled.push({ id: (session as any).id, ok: true, twilio_status: twStatus, duration, final: FINAL_STATUSES.includes(twStatus) });
    }

    return json({ ok: true, checked: sessions?.length || 0, reconciled });
  } catch (e: any) {
    console.error("voice-agent-reconcile error:", e);
    return json({ error: e.message || "Unknown error" }, 500);
  }
});
