import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const AGENTS = {
  ro: "agent_2601kgsvskeef4gvytn91he7x8y2",
  en: "agent_7201kgswwdaafzab2jqfreqbveb7",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Optional auth: if a valid user token is provided, accept it; otherwise allow anonymous
  // (the public voice widget is callable without sign-in). Quota abuse is mitigated upstream.
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (token && token !== Deno.env.get("SUPABASE_ANON_KEY")) {
    try {
      const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
      const { data: userData } = await sb.auth.getUser(token);
      // Don't fail if invalid — just proceed as anonymous.
      if (!userData?.user) {
        console.log("[elevenlabs-conversation-token] Anonymous request (token not user JWT)");
      }
    } catch (e) {
      console.log("[elevenlabs-conversation-token] getUser failed, proceeding anonymous:", (e as Error).message);
    }
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

    if (!ELEVENLABS_API_KEY) {
      console.error("[elevenlabs-conversation-token] ELEVENLABS_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "ElevenLabs API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[elevenlabs-conversation-token] API key present, length:", ELEVENLABS_API_KEY.length);

    // Parse request body. Restrict agentId to the allowlist to prevent quota abuse.
    const ALLOWED_AGENTS = new Set(Object.values(AGENTS));
    let agentId = AGENTS.ro;
    try {
      const body = await req.json();
      if (body.agentId && ALLOWED_AGENTS.has(body.agentId)) {
        agentId = body.agentId;
      } else if (body.language && AGENTS[body.language as keyof typeof AGENTS]) {
        agentId = AGENTS[body.language as keyof typeof AGENTS];
      }
    } catch { /* no body */ }

    console.log("[elevenlabs-conversation-token] Fetching token for agent:", agentId);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${agentId}`,
      {
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[elevenlabs-conversation-token] API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `ElevenLabs API error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("[elevenlabs-conversation-token] Token received successfully for agent:", agentId);

    return new Response(
      JSON.stringify({ token: data.token, agentId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[elevenlabs-conversation-token] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});