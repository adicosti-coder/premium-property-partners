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

// Cartiere centrale + clasice (mix nou + bloc vechi)
const TIMISOARA_ZONES = [
  "Centru", "Cetate", "Iosefin", "Fabric", "Elisabetin",
  "Circumvalațiunii", "Circumvalatiunii",
  "Dumbrăvița", "Dumbravita",
  "Aradului", "Calea Aradului",
  "Lipovei", "Calea Lipovei",
  "Soarelui", "Steaua", "Dacia", "Mehala", "Plopi", "Ronaț", "Ronat",
  "Tipografilor", "Olimpia", "Stadion", "Olimpia-Stadion",
  "Calea Bogdăneștilor", "Calea Bogdanestilor",
  "Calea Buziașului", "Calea Buziasului",
  "Calea Șagului", "Calea Sagului", "Șagului", "Sagului",
  "Calea Martirilor", "Martirilor",
  "Girocului", "Calea Girocului",
  "Bălcescu", "Balcescu",
  "Torontalului", "Complex Studențesc", "Complex Studentesc",
  "Iulius Town", "Take", "Take Park",
];

// Ansambluri rezidențiale noi (cele mai căutate pe Google)
const TIMISOARA_NEW_COMPLEXES = [
  "ISHO", "Openville", "Iulius Town", "Cloud9", "Cloud 9",
  "Vox Vertical Village", "Vox Timisoara",
  "Take Residence", "Take Park",
  "Brytago", "Aviation Park", "City of Mara",
  "Maurus Residence", "Belvedere Residence",
  "Vivenda", "Lake Tower", "Tower Residence",
  "United Business Center", "Ared Uta",
  "Liziera de Lac", "Dumbravita Residence",
  "Green Garden", "Confort Urban", "Borealis",
];

// Comune și localități periurbane Timiș (corridor metropolitan)
const TIMISOARA_PERIURBAN = [
  "Dumbrăvița", "Giroc", "Chișoda", "Chisoda",
  "Moșnița Nouă", "Mosnita Noua", "Moșnița Veche", "Mosnita Veche",
  "Albina", "Săcălaz", "Sacalaz",
  "Sânmihaiu Român", "Sanmihaiu Roman", "Utvin",
  "Ghiroda", "Giarmata", "Giarmata-Vii", "Giarmata Vii",
  "Remetea Mare", "Șag", "Sag",
  "Sânandrei", "Sanandrei", "Becicherecu Mic", "Dudeștii Noi", "Dudestii Noi",
];

// Modificatori cu intenție comercială ridicată
const HIGH_INTENT_MODIFIERS = [
  "ieftin", "pret", "preț", "sub 80000 euro", "sub 100000 euro",
  "rate", "credit", "ipoteca", "ipotecă",
  "direct proprietar", "fara comision", "fără comision",
  "mobilat utilat", "mobilat", "nemobilat",
  "bloc nou", "bloc vechi", "constructie noua", "construcție nouă",
  "predare 2026", "predare la cheie", "key ready", "finalizat",
  "decomandat", "semidecomandat", "confort 1", "confort 2",
  "parter", "etaj intermediar", "ultimul etaj",
  "parcare", "boxa", "boxă", "terasa", "terasă",
  "vedere panoramica", "vedere lac",
];

const REALESTATE_KEYWORDS = [
  "apartament", "garsonier", "garsoniera", "casa", "vila", "teren",
  "spatiu", "comercial", "inchiriere", "inchiri", "închiri",
  "vanzare", "vânzare", "cazare", "regim hotelier", "investitie",
  "investiție", "ansamblu", "rezidential", "rezidențial",
  "bloc", "imobil", "imobiliare",
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

// Note: this function runs with verify_jwt=false and is callable from
// admin UI (via Supabase client + admin JWT) and from pg_cron (via anon JWT).
// It uses the service-role key internally to bypass RLS. No explicit auth
// gate here — matches the pattern of other internal cron functions
// (e.g. scrape-prospects). All mutations go through service-role.

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const startedAt = Date.now();
  const { data: runRow } = await supabase.from("keyword_radar_runs")
    .insert({ run_type: "discover", triggered_by: "api" }).select("id").single();
  const runId = runRow?.id;

  const stats: Record<string, number> = { onsite: 0, gsc: 0, auto_property: 0, auto_zone: 0, seed_complex: 0, seed_periurban: 0, seed_intent: 0, upserted: 0 };
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
      "apartament 4 camere {zone} timisoara",
      "garsoniera {zone} timisoara",
      "garsoniera inchiriere {zone} timisoara",
      "inchiriere apartament {zone} timisoara",
      "inchiriere apartament 2 camere {zone} timisoara",
      "casa vanzare {zone} timisoara",
      "regim hotelier {zone} timisoara",
      "cazare {zone} timisoara",
      "apartament bloc nou {zone} timisoara",
      "apartament bloc vechi {zone} timisoara",
      "apartament decomandat {zone} timisoara",
    ];
    for (const z of TIMISOARA_ZONES) {
      for (const tpl of zoneTemplates) {
        addCandidate(tpl.replace("{zone}", z.toLowerCase()), "auto_zone", 0, { zone: z });
        stats.auto_zone++;
      }
    }

    // ── 5) SEED: ANSAMBLURI REZIDENȚIALE NOI ────────────────────────────────
    const complexTemplates = [
      "apartamente {complex}",
      "apartamente {complex} timisoara",
      "apartamente {complex} de vanzare",
      "apartamente {complex} pret",
      "inchiriere apartament {complex}",
      "cazare {complex}",
      "regim hotelier {complex} timisoara",
      "{complex} predare",
      "{complex} 2 camere",
      "{complex} 3 camere",
      "investitie {complex} timisoara",
    ];
    for (const c of TIMISOARA_NEW_COMPLEXES) {
      for (const tpl of complexTemplates) {
        addCandidate(tpl.replace("{complex}", c.toLowerCase()), "seed_complex", 0, { complex: c });
        stats.seed_complex++;
      }
    }

    // ── 6) SEED: COMUNE PERIURBANE TIMIȘ ───────────────────────────────────
    const periurbanTemplates = [
      "casa vanzare {loc}",
      "casa vanzare {loc} timis",
      "casa noua {loc}",
      "vila vanzare {loc} timis",
      "teren vanzare {loc} timis",
      "teren intravilan {loc}",
      "apartament vanzare {loc}",
      "apartament nou {loc}",
      "inchiriere casa {loc} timis",
      "duplex vanzare {loc} timis",
      "casa direct proprietar {loc}",
    ];
    for (const loc of TIMISOARA_PERIURBAN) {
      for (const tpl of periurbanTemplates) {
        addCandidate(tpl.replace("{loc}", loc.toLowerCase()), "seed_periurban", 0, { commune: loc });
        stats.seed_periurban++;
      }
    }

    // ── 7) SEED: COMBINAȚII CU INTENȚIE COMERCIALĂ ─────────────────────────
    const intentBases = [
      "apartament timisoara",
      "apartament 2 camere timisoara",
      "apartament 3 camere timisoara",
      "garsoniera timisoara",
      "casa timisoara",
      "inchiriere apartament timisoara",
      "cazare timisoara",
    ];
    for (const base of intentBases) {
      for (const mod of HIGH_INTENT_MODIFIERS) {
        addCandidate(`${base} ${mod}`, "seed_intent", 0, { base, modifier: mod });
        stats.seed_intent++;
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
        (c.source === "seed_complex" ? 18 : 0) +
        (c.source === "seed_periurban" ? 12 : 0) +
        (c.source === "seed_intent" ? 8 : 0) +
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
