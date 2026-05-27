// Admin-only proxy for voice-agent-context.
// Keeps VOICE_AGENT_SECRET server-side; client never sees it.
import { requireAdmin } from "../_shared/adminAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const auth = await requireAdmin(req, corsHeaders);
  if (!auth.ok) return auth.response!;

  let body: { phone?: string } = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const phone = (body.phone || "").toString().trim();
  if (!/^\+[1-9]\d{6,14}$/.test(phone)) {
    return new Response(JSON.stringify({ error: "Invalid phone format (E.164 required)" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const voiceSecret = Deno.env.get("VOICE_AGENT_SECRET") || "";
  if (!voiceSecret) {
    return new Response(JSON.stringify({ error: "VOICE_AGENT_SECRET not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const upstream = await fetch(`${supabaseUrl}/functions/v1/voice-agent-context`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Voice-Agent-Secret": voiceSecret,
      },
      body: JSON.stringify({ phone }),
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: "Upstream call failed", details: err?.message }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
