import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ingest-secret, x-scraper-secret",
};

const getExpectedIngestSecrets = (): string[] => {
  return [Deno.env.get("SCRAPER_INGEST_SECRET"), Deno.env.get("INGEST_SECRET")]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim());
};

const getProvidedIngestSecret = (req: Request): string => {
  const directHeader = req.headers.get("x-ingest-secret") ?? req.headers.get("x-scraper-secret");
  if (directHeader) return directHeader.trim();

  const authHeader = req.headers.get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }

  return "";
};

const safeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ── Auth: validate ingest secret ──
  const expectedSecrets = getExpectedIngestSecrets();
  const providedSecret = getProvidedIngestSecret(req);

  if (expectedSecrets.length === 0) {
    console.error("[ingest-scraper-leads] Missing ingest secret env. Expected SCRAPER_INGEST_SECRET or INGEST_SECRET.");
    return new Response(JSON.stringify({ error: "Ingest endpoint misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const isAuthorized =
    providedSecret.length > 0 && expectedSecrets.some((expectedSecret) => safeEqual(providedSecret, expectedSecret));

  if (!isAuthorized) {
    console.warn("[ingest-scraper-leads] Unauthorized request", {
      hasProvidedSecret: providedSecret.length > 0,
      expectedSecretsCount: expectedSecrets.length,
    });
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const leads = Array.isArray(body) ? body : body.leads;
  if (!Array.isArray(leads) || leads.length === 0) {
    return new Response(JSON.stringify({ error: "No leads provided" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // ── Check archived URLs to skip re-import ──
  const urls = leads
    .map((l: any) => l.url)
    .filter((u: any) => typeof u === "string" && u.length > 0);

  let archivedUrls = new Set<string>();
  if (urls.length > 0) {
    const { data: archivedData } = await supabase
      .from("scraper_leads")
      .select("url")
      .eq("status", "archived")
      .in("url", urls);
    if (archivedData) {
      archivedUrls = new Set(archivedData.map((d: any) => d.url));
    }
  }

  // Filter out archived URLs
  const nonArchivedLeads = leads.filter((l: any) => !archivedUrls.has(l.url));

  // ── Lookup phone_intelligence for category auto-assignment ──
  const phones = nonArchivedLeads
    .map((l: any) => l.phone)
    .filter((p: any) => typeof p === "string" && p.length > 0);

  let phoneMap: Record<string, { category: string | null; is_blacklisted: boolean }> = {};
  if (phones.length > 0) {
    const { data: piData } = await supabase
      .from("phone_intelligence")
      .select("phone_number, category, is_blacklisted")
      .in("phone_number", phones);
    if (piData) {
      for (const pi of piData) {
        phoneMap[pi.phone_number] = {
          category: pi.category,
          is_blacklisted: pi.is_blacklisted,
        };
      }
    }
  }

  // ── Filter out blacklisted phones ──
  const filteredLeads = nonArchivedLeads.filter((l: any) => {
    if (l.phone && phoneMap[l.phone]?.is_blacklisted) {
      console.log(`Skipping blacklisted phone: ${l.phone}`);
      return false;
    }
    return true;
  });

  if (filteredLeads.length === 0) {
    const archivedCount = leads.length - nonArchivedLeads.length;
    const blacklistedCount = nonArchivedLeads.length - filteredLeads.length;
    return new Response(
      JSON.stringify({
        success: true,
        count: 0,
        archived_skipped: archivedCount,
        blacklisted_skipped: blacklistedCount,
        message: `Niciun lead nou. ${archivedCount} arhivate, ${blacklistedCount} blocate.`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── Prepare rows ──
  const rows = filteredLeads.map((l: Record<string, any>) => {
    const phoneInfo = l.phone ? phoneMap[l.phone] : null;
    return {
      title: String(l.title ?? ""),
      original_price: Number(l.original_price ?? 0),
      extra_profit_3y: Number(l.extra_profit_3y ?? (Number(l.monthly_extra ?? 0) * 36)),
      monthly_extra: Number(l.monthly_extra ?? 0),
      lead_score: Number(l.lead_score ?? 0),
      whatsapp_message: l.whatsapp_message ? String(l.whatsapp_message) : null,
      url: String(l.url ?? ""),
      status: String(l.status ?? "new"),
      listing_type: String(l.listing_type ?? "vanzare"),
      source: l.source ? String(l.source) : "OLX",
      phone: l.phone ? String(l.phone) : null,
      // Auto-assign category from phone_intelligence if available
      prospect_category: phoneInfo?.category || null,
      ...(phoneInfo?.category ? { admin_notes: `[Auto] Categorie telefon: ${phoneInfo.category}` } : {}),
      created_at: new Date().toISOString(),
    };
  });

  // ── Also upsert phone_intelligence for new phones ──
  const newPhones = filteredLeads
    .filter((l: any) => l.phone && !phoneMap[l.phone])
    .map((l: any) => ({
      phone_number: String(l.phone),
      category: null,
      is_blacklisted: false,
      last_seen: new Date().toISOString(),
    }));

  if (newPhones.length > 0) {
    await supabase
      .from("phone_intelligence")
      .upsert(newPhones, { onConflict: "phone_number" });
  }

  // ── Upsert leads (but don't overwrite archived ones) ──
  const { data, error } = await supabase
    .from("scraper_leads")
    .upsert(rows, {
      onConflict: "url",
      ignoreDuplicates: false,
    })
    .select("id, title, source, url, phone");

  if (error) {
    console.error("Supabase Upsert Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const archivedCount = leads.length - nonArchivedLeads.length;
  const blacklistedCount = nonArchivedLeads.length - filteredLeads.length;
  return new Response(
    JSON.stringify({
      success: true,
      count: data?.length ?? 0,
      archived_skipped: archivedCount,
      blacklisted_skipped: blacklistedCount,
      message: `Ingestie reușită: ${data?.length ?? 0} lead-uri.${archivedCount > 0 ? ` ${archivedCount} arhivate ignorate.` : ""}${blacklistedCount > 0 ? ` ${blacklistedCount} blocate.` : ""}`,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
