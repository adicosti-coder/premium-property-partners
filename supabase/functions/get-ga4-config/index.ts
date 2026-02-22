import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const measurementId = Deno.env.get("GA4_MEASUREMENT_ID");
  if (!measurementId) {
    return new Response(JSON.stringify({ error: "GA4_MEASUREMENT_ID not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  return new Response(JSON.stringify({ measurementId }), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
});
