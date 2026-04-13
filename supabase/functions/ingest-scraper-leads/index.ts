import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ingest-secret, x-scraper-secret",
};

// ── Neighborhood keyword mapping (mirrors src/utils/mapLocationToSlug.ts) ──
const KEYWORD_MAP: { keywords: string[]; slug: string }[] = [
  { keywords: ["isho", "i should have one"], slug: "isho" },
  { keywords: ["aradului", "iulius", "torontalului", "openville"], slug: "zona-aradului" },
  { keywords: ["girocului", "soarelui", "martirilor"], slug: "zona-girocului" },
  { keywords: ["complex", "studentesc", "studențesc", "uvt", "politehnica"], slug: "complex-studentesc" },
  { keywords: ["sagului", "șagului", "steaua"], slug: "sagului" },
  { keywords: ["mara", "circumvalatiunii", "circumvalațiunii", "bega"], slug: "circumvalatiunii" },
  { keywords: ["lipovei", "ionescu de la brad"], slug: "calea-lipovei" },
];

const AVG_MONTHLY_RENT_PER_SQM: Record<string, number> = {
  "isho": 14, "zona-aradului": 11.5, "zona-girocului": 10,
  "complex-studentesc": 11, "sagului": 9.5, "circumvalatiunii": 12, "calea-lipovei": 9,
};

function removeDiacritics(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function mapLocationToSlug(location?: string | null, title?: string | null): string | null {
  const combined = removeDiacritics(`${location ?? ""} ${title ?? ""}`);
  for (const entry of KEYWORD_MAP) {
    for (const kw of entry.keywords) {
      if (combined.includes(removeDiacritics(kw))) return entry.slug;
    }
  }
  return null;
}

function estimateROI(price: number, sizeSqm: number, slug: string): number | null {
  const rentPerSqm = AVG_MONTHLY_RENT_PER_SQM[slug];
  if (!rentPerSqm || !price || price <= 0 || !sizeSqm || sizeSqm <= 0) return null;
  const netAnnual = rentPerSqm * sizeSqm * 12 * 0.8;
  return Math.round((netAnnual / price) * 100 * 100) / 100;
}

// ── Auth helpers ──
const getExpectedIngestSecrets = (): string[] => {
  return [Deno.env.get("SCRAPER_INGEST_SECRET"), Deno.env.get("INGEST_SECRET")]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim());
};

const getProvidedIngestSecret = (req: Request): string => {
  const directHeader = req.headers.get("x-ingest-secret") ?? req.headers.get("x-scraper-secret");
  if (directHeader) return directHeader.trim();
  const authHeader = req.headers.get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) return authHeader.slice(7).trim();
  return "";
};

const safeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ── Auth ──
  const expectedSecrets = getExpectedIngestSecrets();
  const providedSecret = getProvidedIngestSecret(req);

  if (expectedSecrets.length === 0) {
    console.error("[ingest-scraper-leads] Missing ingest secret env.");
    return new Response(JSON.stringify({ error: "Ingest endpoint misconfigured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const isAuthorized = providedSecret.length > 0 && expectedSecrets.some((s) => safeEqual(providedSecret, s));
  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const leads = Array.isArray(body) ? body : body.leads;
  if (!Array.isArray(leads) || leads.length === 0) {
    return new Response(JSON.stringify({ error: "No leads provided" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // ── Check archived URLs ──
  const urls = leads.map((l: any) => l.url).filter((u: any) => typeof u === "string" && u.length > 0);
  let archivedUrls = new Set<string>();
  if (urls.length > 0) {
    const { data: archivedData } = await supabase
      .from("scraper_leads").select("url").eq("status", "archived").in("url", urls);
    if (archivedData) archivedUrls = new Set(archivedData.map((d: any) => d.url));
  }
  const nonArchivedLeads = leads.filter((l: any) => !archivedUrls.has(l.url));

  // ── Phone intelligence lookup ──
  const phones = nonArchivedLeads.map((l: any) => l.phone).filter((p: any) => typeof p === "string" && p.length > 0);
  let phoneMap: Record<string, { category: string | null; is_blacklisted: boolean }> = {};
  if (phones.length > 0) {
    const { data: piData } = await supabase
      .from("phone_intelligence").select("phone_number, category, is_blacklisted").in("phone_number", phones);
    if (piData) {
      for (const pi of piData) phoneMap[pi.phone_number] = { category: pi.category, is_blacklisted: pi.is_blacklisted };
    }
  }

  // ── Filter blacklisted ──
  const filteredLeads = nonArchivedLeads.filter((l: any) => {
    if (l.phone && phoneMap[l.phone]?.is_blacklisted) return false;
    return true;
  });

  if (filteredLeads.length === 0) {
    const archivedCount = leads.length - nonArchivedLeads.length;
    const blacklistedCount = nonArchivedLeads.length - filteredLeads.length;
    return new Response(JSON.stringify({
      success: true, count: 0, archived_skipped: archivedCount, blacklisted_skipped: blacklistedCount,
      priority_mapped: 0,
      message: `Niciun lead nou. ${archivedCount} arhivate, ${blacklistedCount} blocate.`,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // ── Prepare rows with neighborhood mapping & prioritization ──
  let priorityMapped = 0;
  const rows = filteredLeads.map((l: Record<string, any>) => {
    const phoneInfo = l.phone ? phoneMap[l.phone] : null;

    // Neighborhood auto-mapping
    const matchedSlug = mapLocationToSlug(l.location || l.title, l.title);
    const isPriority = matchedSlug !== null;
    if (isPriority) priorityMapped++;

    // Auto-ROI estimation for priority leads
    const price = Number(l.original_price ?? 0);
    const size = Number(l.size ?? l.surface ?? 0);
    let estimatedRoi: number | null = null;
    let seoDescription: string | null = null;

    if (isPriority && matchedSlug) {
      estimatedRoi = estimateROI(price, size, matchedSlug);

      // Auto-generate SEO-style description
      const rooms = Number(l.rooms ?? 1);
      const type = rooms === 1 ? "garsonieră" : `apartament ${rooms} camere`;
      const zoneName = matchedSlug.replace(/-/g, " ").replace(/^zona /, "").replace(/^calea /, "Calea ");
      seoDescription = `${type.charAt(0).toUpperCase() + type.slice(1)} în ${zoneName}, Timișoara.${estimatedRoi ? ` Randament estimat: ${estimatedRoi}%.` : ""} Administrare RealTrust inclusă.`;
    }

    const notes: string[] = [];
    if (phoneInfo?.category) notes.push(`[Auto] Categorie telefon: ${phoneInfo.category}`);
    if (isPriority && matchedSlug) notes.push(`[Auto] Zona prioritară: ${matchedSlug}`);
    if (estimatedRoi) notes.push(`[Auto] ROI estimat: ${estimatedRoi}%`);

    return {
      title: String(l.title ?? ""),
      original_price: price,
      extra_profit_3y: Number(l.extra_profit_3y ?? (Number(l.monthly_extra ?? 0) * 36)),
      monthly_extra: Number(l.monthly_extra ?? 0),
      lead_score: Number(l.lead_score ?? 0),
      whatsapp_message: l.whatsapp_message ? String(l.whatsapp_message) : null,
      url: String(l.url ?? ""),
      status: isPriority ? "priority" : String(l.status ?? "new"),
      listing_type: String(l.listing_type ?? "vanzare"),
      source: l.source ? String(l.source) : "OLX",
      phone: l.phone ? String(l.phone) : null,
      prospect_category: phoneInfo?.category || null,
      admin_notes: notes.length > 0 ? notes.join(" | ") : null,
      // Priority zone metadata
      neighborhood_slug: matchedSlug,
      estimated_roi: estimatedRoi,
      seo_description: seoDescription,
      is_priority: isPriority,
      created_at: new Date().toISOString(),
    };
  });

  // ── Upsert new phones ──
  const newPhones = filteredLeads
    .filter((l: any) => l.phone && !phoneMap[l.phone])
    .map((l: any) => ({ phone_number: String(l.phone), category: null, is_blacklisted: false, last_seen: new Date().toISOString() }));
  if (newPhones.length > 0) {
    await supabase.from("phone_intelligence").upsert(newPhones, { onConflict: "phone_number" });
  }

  // ── Upsert leads ──
  const { data, error } = await supabase
    .from("scraper_leads")
    .upsert(rows, { onConflict: "url", ignoreDuplicates: false })
    .select("id, title, source, url, phone, neighborhood_slug, is_priority");

  if (error) {
    console.error("Supabase Upsert Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const archivedCount = leads.length - nonArchivedLeads.length;
  const blacklistedCount = nonArchivedLeads.length - filteredLeads.length;
  return new Response(JSON.stringify({
    success: true,
    count: data?.length ?? 0,
    priority_mapped: priorityMapped,
    archived_skipped: archivedCount,
    blacklisted_skipped: blacklistedCount,
    message: `Ingestie reușită: ${data?.length ?? 0} lead-uri (${priorityMapped} prioritare).${archivedCount > 0 ? ` ${archivedCount} arhivate ignorate.` : ""}${blacklistedCount > 0 ? ` ${blacklistedCount} blocate.` : ""}`,
  }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
