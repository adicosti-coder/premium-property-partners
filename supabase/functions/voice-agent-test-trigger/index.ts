import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/* Internal admin-side test trigger: invokes voice-agent-initiate using the
   SERVICE_ROLE_KEY via x-webhook-secret. Used only for E2E QA from tooling. */

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const body = await req.json().catch(() => ({}));
    const action = body.action || "initiate";

    if (action === "reconcile") {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/voice-agent-reconcile`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
        body: JSON.stringify(body.payload || {}),
      });
      const text = await resp.text();
      return new Response(JSON.stringify({ status: resp.status, body: tryParse(text) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toNumber = typeof body.toNumber === "string" ? body.toNumber.trim() : "";
    if (!toNumber) {
      return new Response(
        JSON.stringify({ error: "toNumber is required (no hardcoded fallback number)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const objective = body.objective || "Test E2E – validare webhook status";
    const customPrompt = body.customPrompt || "";

    const resp = await fetch(`${SUPABASE_URL}/functions/v1/voice-agent-initiate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": SERVICE_KEY,
      },
      body: JSON.stringify({ toNumber, objective, customPrompt }),
    });
    const text = await resp.text();
    return new Response(JSON.stringify({ status: resp.status, body: tryParse(text) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

function tryParse(s: string) {
  try { return JSON.parse(s); } catch { return s; }
}
