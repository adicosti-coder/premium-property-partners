import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Default agents for each language
const AGENTS = {
  ro: "agent_2601kgsvskeef4gvytn91he7x8y2", // Romanian agent
  en: "agent_7201kgswwdaafzab2jqfreqbveb7", // English agent
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    // Parse request body for language/agentId
    let agentId = AGENTS.ro; // Default to Romanian
    try {
      const body = await req.json();
      console.log("[elevenlabs-conversation-token] Request body:", JSON.stringify(body));
      if (body.agentId) {
        agentId = body.agentId;
      } else if (body.language && AGENTS[body.language as keyof typeof AGENTS]) {
        agentId = AGENTS[body.language as keyof typeof AGENTS];
      }
    } catch {
      // No body or invalid JSON, use default
      console.log("[elevenlabs-conversation-token] No body, using default agent");
    }

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