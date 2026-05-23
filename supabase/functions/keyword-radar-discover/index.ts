// Keyword Radar — Discover
// Pulls candidate keywords from 3 sources and upserts them into
// `keyword_radar_queries`:
//   1) On-site searches (cta_analytics where event = 'ai_search' / 'semantic_search')
//   2) Google Search Console snapshots (seo_gsc_daily, last 30 days)
//   3) Auto-derived from existing properties + Timișoara neighborhoods
//
// Callable manually by admins OR by the daily cron at 06:00.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TIMISOARA_ZONES = [
  "Centru", "Cetate", "Iosefin", "Fabric", "Elisabetin",
  "Circumvalațiunii", "Dumbrăvița", "Aradului", "Lipovei",
  "Soarelui", "Torontalului", "Complex Studențesc", "Iulius Town",
];

const REALESTATE_KEYWORDS = [
  "apartament", "garsonier", "garsoniera", "casa", "vila", "teren",
  "spatiu", "comercial", "inchiriere", "inchiri", "închiri",
  "vanzare", "vânzare", "cazare", "regim hotelier", "investitie",
  "investiție", "ansamblu", "rezidential", "rezidențial",
];

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

function isRealEstateRelated(q: string): boolean {
  const low = q.toLowerCase();
  if (!low.includes("timi")) {
    // accept even without "timisoara" if a zone is present
    const hasZone = TIMISOARA_ZONES.some((z) =>
      low.includes(z.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
    );
    if (!hasZone) return false;
  }
  return REALESTATE_KEYWORDS.some((k) => low.includes(k));
}

function detectCategory(q: string): string {
  const low = q.toLowerCase();
  if (/(cazare|regim hotelier|airbnb|booking|noapte)/.test(low)) return "cazare";
  if (/(inchiri|închiri|chirie|rent|\/lun)/.test(low)) return "inchiriere";
  if (/(investit|roi|randament)/.test(low)) return "investitie";
  if (/(ansamblu|rezident)/.test(low)) return "ansamblu";
  if (/(vanzare|vânzare|vand|vând)/.test(low)) return "vanzare";
  return "general";
}

function platformsForCategory(category: string): string[] {
  if (category === "cazare") return ["OLX", "Storia.ro", "imobiliare.ro", "Booking.com", "Airbnb"];
  return ["OLX", "Storia.ro", "imobiliare.ro"];
}

async function requireAdmin(req: Request, supabase: any): Promise<Response | null> {
  // Allow internal calls (cron / orchestrator) via service-role
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) return null;

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
  const { data: u } = await userClient.auth.getUser(token);
  if (!u?.user) {
    return new Response(JSON.stringify({ error: "Auth required" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: role } = await supabase.from("user_roles").select("role")
    .eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
  if (!role) {
    return new Response(JSON.stringify({ error: "Admin required" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const adminCheck = await requireAdmin(req, supabase);
  if (adminCheck) return adminCheck;

  const startedAt = Date.now();
  const { data: runRow } = await supabase.from("keyword_radar_runs")
    .insert({ run_type: "discover", triggered_by: "api" }).select("id").single();
  const runId = runRow?.id;

  const stats: Record<string, number> = { onsite: 0, gsc: 0, auto_property: 0, auto_zone: 0, upserted: 0 };
  const candidates: Map<string, {
    keyword: string; source: string; volume: number; category: string;
    platforms: string[]; metadata: Record<string, unknown>;
  }> = new Map();

  function addCandidate(kw: string, source: string, volume: number, metadata: Record<string, unknown> = {}) {
    const norm = normalize(kw);
    if (!norm || norm.length < 4 || norm.length > 120) return;
    const cat = detectCategory(norm);
    const existing = candidates.get(norm);
    if (existing) {
      existing.volume += volume;
      Object.assign(existing.metadata, metadata);
    } else {
      candidates.set(norm, {
        keyword: norm, source, volume, category: cat,
        platforms: platformsForCategory(cat), metadata,
      });
    }
  }

  try {
    // ── 1) ON-SITE SEARCHES (cta_analytics) ─────────────────────────────────
    const since = new Date(Date.now() - 30 * 86400 * 1000).toISOString();
    const { data: ctaRows } = await supabase
      .from("cta_analytics")
      .select("metadata, cta_type, created_at")
      .gte("created_at", since)
      .in("cta_type", ["ai_search", "semantic_search", "search_query", "search"])
      .limit(2000);

    for (const row of ctaRows || []) {
      const meta = (row.metadata || {}) as Record<string, unknown>;
      const q = (meta.query || meta.search_query || meta.text || meta.q) as string | undefined;
      if (q && typeof q === "string" && isRealEstateRelated(q)) {
        addCandidate(q, "onsite", 1, { last_seen: row.created_at });
        stats.onsite++;
      }
    }

    // ── 2) GOOGLE SEARCH CONSOLE (seo_gsc_daily) ────────────────────────────
    const since30 = new Date(Date.now() - 30 * 86400 * 1000).toISOString().slice(0, 10);
    const { data: gscRows } = await supabase
      .from("seo_gsc_daily")
      .select("query, impressions, clicks")
      .gte("date", since30)
      .limit(5000);

    // Aggregate by query
    const gscAgg = new Map<string, { impressions: number; clicks: number }>();
    for (const row of gscRows || []) {
      if (!row.query || !isRealEstateRelated(row.query)) continue;
      const prev = gscAgg.get(row.query) || { impressions: 0, clicks: 0 };
      prev.impressions += row.impressions || 0;
      prev.clicks += row.clicks || 0;
      gscAgg.set(row.query, prev);
    }
    // Top 80 by impressions
    const gscTop = [...gscAgg.entries()]
      .sort((a, b) => b[1].impressions - a[1].impressions)
      .slice(0, 80);
    for (const [q, agg] of gscTop) {
      addCandidate(q, "gsc", agg.impressions, { clicks: agg.clicks });
      stats.gsc++;
    }

    // ── 3) AUTO-DERIVED FROM EXISTING PROPERTIES ────────────────────────────
    const { data: props } = await supabase
      .from("properties")
      .select("location, listing_type, rooms, listing_category")
      .eq("is_published", true)
      .limit(500);

    const zoneSet = new Set<string>();
    const tplSet = new Set<string>();
    for (const p of props || []) {
      const loc = (p.location || "").trim();
      if (loc) zoneSet.add(loc);
      const lt = (p.listing_type || "").toLowerCase();
      const noun =
        lt === "inchiriere" ? "inchiriere apartament" :
        lt === "cazare" || (p.listing_category as string) === "regim_hotelier" ? "cazare apartament" :
        "apartament vanzare";
      if (loc) tplSet.add(`${noun} ${loc} timisoara`);
      if (loc && p.rooms) tplSet.add(`apartament ${p.rooms} camere ${loc} timisoara`);
    }
    for (const tpl of tplSet) {
      addCandidate(tpl, "auto_property", 0);
      stats.auto_property++;
    }

    // ── 4) AUTO-DERIVED FROM TIMIȘOARA ZONES ────────────────────────────────
    const zoneTemplates = [
      "apartament vanzare {zone} timisoara",
      "apartament 2 camere {zone} timisoara",
      "apartament 3 camere {zone} timisoara",
      "garsoniera {zone} timisoara",
      "inchiriere apartament {zone} timisoara",
      "casa vanzare {zone} timisoara",
    ];
    for (const z of TIMISOARA_ZONES) {
      for (const tpl of zoneTemplates) {
        addCandidate(tpl.replace("{zone}", z.toLowerCase()), "auto_zone", 0, { zone: z });
        stats.auto_zone++;
      }
    }

    // ── UPSERT ─────────────────────────────────────────────────────────────
    const rows = [...candidates.values()].map((c) => ({
      keyword: c.keyword,
      source: c.source,
      category: c.category,
      platforms: c.platforms,
      // priority: heavy weight on real-user signal, light on derived templates
      priority_score:
        (c.source === "onsite" ? 100 : 0) +
        (c.source === "gsc" ? Math.min(c.volume / 10, 100) : 0) +
        (c.source === "auto_property" ? 20 : 0) +
        (c.source === "auto_zone" ? 5 : 0),
      volume: c.volume,
      metadata: c.metadata,
    }));

    // Upsert in batches of 200
    let upserted = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const batch = rows.slice(i, i + 200);
      const { error } = await supabase
        .from("keyword_radar_queries")
        .upsert(batch, { onConflict: "keyword_normalized", ignoreDuplicates: false });
      if (error) {
        console.error("upsert error", error);
      } else {
        upserted += batch.length;
      }
    }
    stats.upserted = upserted;

    await supabase.from("keyword_radar_runs").update({
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
      status: "success",
      stats,
    }).eq("id", runId);

    return new Response(JSON.stringify({ success: true, stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase.from("keyword_radar_runs").update({
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
      status: "failed",
      stats,
      error: msg,
    }).eq("id", runId);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
