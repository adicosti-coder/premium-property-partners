import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-ingest-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // --- Auth via shared secret ---
  const secret = Deno.env.get("SCRAPER_INGEST_SECRET");
  const provided = req.headers.get("x-ingest-secret");

  if (!secret || !provided || provided !== secret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // --- Parse body ---
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const leads = Array.isArray(body) ? body : [body];

  if (leads.length === 0) {
    return new Response(JSON.stringify({ error: "Empty payload" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // --- Validate each lead ---
  const requiredFields = ["title", "url"];
  for (const lead of leads) {
    for (const field of requiredFields) {
      if (!lead[field]) {
        return new Response(
          JSON.stringify({ error: `Missing required field: ${field}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
  }

  // --- Insert using service_role ---
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const rows = leads.map((l: Record<string, unknown>) => ({
    title: String(l.title ?? ""),
    original_price: Number(l.original_price ?? 0),
    extra_profit_3y: Number(l.extra_profit_3y ?? 0),
    monthly_extra: Number(l.monthly_extra ?? 0),
    lead_score: Number(l.lead_score ?? 0),
    whatsapp_message: String(l.whatsapp_message ?? ""),
    url: String(l.url ?? ""),
    status: String(l.status ?? "new"),
    listing_type: String(l.listing_type ?? "vanzare"),
  }));

  const { data, error } = await supabase
    .from("scraper_leads")
    .upsert(rows, { onConflict: "url", ignoreDuplicates: false })
    .select("id, title, url");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ success: true, inserted: data?.length ?? 0, data }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});