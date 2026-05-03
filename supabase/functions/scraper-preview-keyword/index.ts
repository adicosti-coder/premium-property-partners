// Preview-only endpoint. Runs Firecrawl /search for ONE keyword with the
// per-keyword owner-only filter toggles applied (mirroring `scrape-prospects`)
// and returns the resulting URLs WITHOUT inserting anything into the DB.
// Used by the admin "Preview" page to verify which listings survive the
// owner-only filters per platform (OLX, Publi24, imobiliare.ro, …).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Mirror of PLATFORM_FILTER_TOGGLES in scrape-prospects/index.ts ────────
type PlatformFilterDef = { id: string; label: string; hint: string; defaultOn: boolean };

const PLATFORM_FILTER_TOGGLES: Record<string, PlatformFilterDef[]> = {
  "OLX": [
    { id: "private",       label: "Privat (Persoană fizică)", hint: "inurl:search%5Bprivate_business%5D=private OR inurl:search[private_business]=private", defaultOn: true },
    { id: "exclude_firma", label: 'Exclude „Firmă”',         hint: '-inurl:business -"de la firma" -"de la companie"', defaultOn: true },
  ],
  "Storia.ro": [
    { id: "private",        label: "Doar proprietari", hint: "inurl:ownerTypeSingleSelect=PRIVATE", defaultOn: true },
    { id: "exclude_agency", label: "Exclude agenții",  hint: "-inurl:ownerTypeSingleSelect=AGENCY -inurl:by=agency", defaultOn: true },
  ],
  "imobiliare.ro": [
    { id: "owners",    label: "Publicate de proprietari", hint: "inurl:persoane-fizice OR inurl:proprietari", defaultOn: true },
    { id: "no_agency", label: "Fără agenții",             hint: "-inurl:agentii -inurl:agency", defaultOn: true },
    { id: "no_dev",    label: "Fără dezvoltatori",        hint: "-inurl:dezvoltatori -inurl:developer", defaultOn: false },
  ],
  "Publi24": [
    { id: "private",  label: "De la persoane fizice", hint: "inurl:tip-anunt-persoane-fizice OR inurl:proprietari", defaultOn: true },
    { id: "no_firms", label: "Fără companii",         hint: "-inurl:tip-anunt-firma -inurl:agentie", defaultOn: true },
  ],
  "BursaImobiliara.ro": [
    { id: "private",   label: "Doar proprietari", hint: "inurl:proprietar OR inurl:persoane-fizice", defaultOn: true },
    { id: "no_agency", label: "Fără agenții",     hint: "-inurl:agentie -inurl:agency", defaultOn: true },
  ],
  "Facebook Marketplace": [
    { id: "owner_kw",  label: 'Caută „proprietar / persoană fizică”', hint: '("proprietar" OR "persoana fizica" OR "persoană fizică")', defaultOn: true },
    { id: "no_agency", label: 'Exclude „agenție / comision”',         hint: '-agentie -agenție -agency -"comision agentie" -broker', defaultOn: true },
  ],
  "Grupuri Facebook": [
    { id: "owner_kw",  label: 'Caută „proprietar / persoană fizică”', hint: '("proprietar" OR "persoana fizica" OR "persoană fizică")', defaultOn: true },
    { id: "no_agency", label: 'Exclude „agenție / comision”',         hint: '-agentie -agenție -agency -"comision agentie" -broker', defaultOn: true },
  ],
  "General": [
    { id: "owner_kw",  label: 'Caută „proprietar / persoană fizică”',  hint: '("proprietar" OR "persoana fizica" OR "persoană fizică" OR "fara comision" OR "fără comision" OR "direct proprietar")', defaultOn: true },
    { id: "no_agency", label: 'Exclude „agenție / broker / comision”', hint: '-agentie -agenție -agency -"comision agentie" -"comision 2%" -"comision agenție" -broker', defaultOn: true },
  ],
};

function getToggleDefs(platform: string): PlatformFilterDef[] {
  return PLATFORM_FILTER_TOGGLES[platform] ?? PLATFORM_FILTER_TOGGLES["General"];
}

function applyOwnerOnlyFilter(
  platform: string,
  query: string,
  override?: { toggles?: string[] },
): { finalQuery: string; appliedHints: { id: string; label: string; hint: string }[] } {
  const lower = query.toLowerCase();
  let result = query.trim();
  const defs = getToggleDefs(platform);
  const enabledIds: string[] = Array.isArray(override?.toggles)
    ? override!.toggles!
    : defs.filter((d) => d.defaultOn).map((d) => d.id);

  const applied: { id: string; label: string; hint: string }[] = [];
  for (const def of defs) {
    if (!enabledIds.includes(def.id)) continue;
    const firstToken = def.hint.split(/\s+/)[0]?.toLowerCase() ?? "";
    if (firstToken && lower.includes(firstToken)) continue;
    result = `${result} ${def.hint}`;
    applied.push({ id: def.id, label: def.label, hint: def.hint });
  }
  return { finalQuery: result, appliedHints: applied };
}

function detectOwnerSignals(text: string, url: string): { isOwner: boolean; reasons: string[] } {
  const blob = `${text} ${url}`.toLowerCase();
  const reasons: string[] = [];
  let agencyHits = 0;

  if (/\b(proprietar|persoan[aă]\s*fizic[aă]|f[aă]r[aă]\s*comision|direct\s*proprietar)\b/.test(blob)) {
    reasons.push("✅ menționează proprietar/persoană fizică");
  }
  if (/inurl:|search%5bprivate|persoane-fizice|proprietari|tip-anunt-persoane/.test(url.toLowerCase())) {
    reasons.push("✅ URL conține filtru privat");
  }
  if (/\b(agen[tț]ie|agency|broker|imobiliar[aă]\s+srl|comision\s+(2|3|agen))\b/.test(blob)) {
    reasons.push("⚠️ conține „agenție/broker/comision”");
    agencyHits++;
  }
  if (/\/agentii\/|\/agency\/|tip-anunt-firma|by=agency|ownertypesingleselect=agency/.test(url.toLowerCase())) {
    reasons.push("⚠️ URL marcat agenție");
    agencyHits++;
  }

  return {
    isOwner: agencyHits === 0 && reasons.some((r) => r.startsWith("✅")),
    reasons,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Require admin
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return new Response(JSON.stringify({ success: false, error: "Auth required" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: u } = await userClient.auth.getUser(token);
    if (!u?.user) return new Response(JSON.stringify({ success: false, error: "Invalid token" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: roleRow } = await supabase.from("user_roles").select("role")
      .eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ success: false, error: "Admin required" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ success: false, error: "FIRECRAWL_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let body: any = {};
    try { body = await req.json(); } catch { /* empty */ }
    const mode: string = body?.mode || "preview";
    const keywordId: string | undefined = body?.keyword_id;
    const limit: number = Math.min(Math.max(Number(body?.limit) || 15, 1), 30);


    // ── Mode: queries-overview ─ returns final queries for ALL active keywords
    //    (no Firecrawl calls — fast, used to preview the platform-by-platform plan).
    if (mode === "queries-overview") {
      const { data: rows, error: rowsErr } = await supabase
        .from("scraper_search_keywords")
        .select("id, keyword, platform, owner_filters, is_active")
        .order("platform", { ascending: true });
      if (rowsErr) {
        return new Response(
          JSON.stringify({ success: false, error: rowsErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const overview = (rows || []).map((r: any) => {
        const overrides = (r.owner_filters && typeof r.owner_filters === "object")
          ? r.owner_filters as { toggles?: string[] }
          : undefined;
        const { finalQuery, appliedHints } = applyOwnerOnlyFilter(r.platform, r.keyword, overrides);
        return {
          id: r.id,
          platform: r.platform,
          is_active: r.is_active,
          neutral_query: r.keyword,
          final_query: finalQuery,
          applied_hints: appliedHints,
        };
      });
      return new Response(
        JSON.stringify({ success: true, mode, overview }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Mode: finalize ─ marks a preview batch as verified for a given keyword.
    //    Stores a verification stamp inside scraper_search_keywords.owner_filters.last_preview_verified.
    //    Read-only on listings; idempotent.
    if (mode === "finalize") {
      if (!keywordId) {
        return new Response(
          JSON.stringify({ success: false, error: "keyword_id required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const { data: existing, error: exErr } = await supabase
        .from("scraper_search_keywords")
        .select("owner_filters")
        .eq("id", keywordId)
        .maybeSingle();
      if (exErr) {
        return new Response(
          JSON.stringify({ success: false, error: exErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const currentFilters = (existing?.owner_filters && typeof existing.owner_filters === "object")
        ? existing.owner_filters as Record<string, unknown>
        : {};
      const isLastStep: boolean = body?.last_step === true;
      const verification = {
        verified_at: new Date().toISOString(),
        applied_hints: Array.isArray(body?.applied_hints) ? body.applied_hints : [],
        final_query: typeof body?.final_query === "string" ? body.final_query : null,
        stats: body?.stats ?? null,
        last_step: isLastStep,
        // When admin clicks "Finalizează ca ultim pas" we also tag the batch
        // as Processed so dashboards can filter on it.
        status: isLastStep ? "processed" : "verified",
      };
      const nextFilters = { ...currentFilters, last_preview_verified: verification };
      const { error: upErr } = await supabase
        .from("scraper_search_keywords")
        .update({ owner_filters: nextFilters })
        .eq("id", keywordId);
      if (upErr) {
        return new Response(
          JSON.stringify({ success: false, error: upErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ success: true, mode, verification }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!keywordId) {
      return new Response(
        JSON.stringify({ success: false, error: "keyword_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // (supabase client already created above)

    const { data: kw, error: kwErr } = await supabase
      .from("scraper_search_keywords")
      .select("id, keyword, platform, owner_filters, is_active")
      .eq("id", keywordId)
      .maybeSingle();

    if (kwErr || !kw) {
      return new Response(
        JSON.stringify({ success: false, error: "Keyword not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const overrides = (kw.owner_filters && typeof kw.owner_filters === "object")
      ? kw.owner_filters as { toggles?: string[] }
      : undefined;

    // Two queries: one WITH owner-only filters applied, one WITHOUT (raw).
    const { finalQuery, appliedHints } = applyOwnerOnlyFilter(
      kw.platform,
      kw.keyword,
      overrides,
    );

    async function runSearch(q: string) {
      const r = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${firecrawlKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: q,
          limit,
          lang: "ro",
          country: "ro",
        }),
      });
      const j = await r.json();
      return Array.isArray(j?.data) ? j.data : [];
    }

    const [filteredRaw, neutralRaw] = await Promise.all([
      runSearch(finalQuery),
      runSearch(kw.keyword),
    ]);

    const filtered = filteredRaw.map((it: any) => {
      const sig = detectOwnerSignals(`${it.title || ""} ${it.description || ""}`, it.url || "");
      return {
        title: it.title || "(fără titlu)",
        url: it.url,
        description: (it.description || "").slice(0, 240),
        owner_signal: sig,
      };
    });

    const filteredUrlSet = new Set(filtered.map((f: any) => f.url));
    const removedByFilters = neutralRaw
      .filter((it: any) => it.url && !filteredUrlSet.has(it.url))
      .map((it: any) => {
        const sig = detectOwnerSignals(`${it.title || ""} ${it.description || ""}`, it.url || "");
        return {
          title: it.title || "(fără titlu)",
          url: it.url,
          description: (it.description || "").slice(0, 240),
          owner_signal: sig,
        };
      });

    const ownerCount = filtered.filter((f: any) => f.owner_signal.isOwner).length;
    const suspectAgencyCount = filtered.filter((f: any) =>
      f.owner_signal.reasons.some((r: string) => r.startsWith("⚠️"))
    ).length;

    return new Response(
      JSON.stringify({
        success: true,
        keyword: {
          id: kw.id,
          keyword: kw.keyword,
          platform: kw.platform,
          is_active: kw.is_active,
        },
        applied_hints: appliedHints,
        final_query: finalQuery,
        neutral_query: kw.keyword,
        stats: {
          neutral_total: neutralRaw.length,
          filtered_total: filtered.length,
          removed_by_filters: removedByFilters.length,
          owner_signals: ownerCount,
          suspect_agency: suspectAgencyCount,
        },
        filtered_results: filtered,
        removed_by_filters: removedByFilters,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ success: false, error: e?.message || String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
