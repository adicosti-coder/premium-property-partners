/**
 * SEO Auto-Fix & Version Control
 *
 * Actions:
 *  - generate_fix              : ask Gemini to produce a fix for a specific issue.
 *  - apply_fix                 : write proposal into seo_overrides + history snapshot.
 *  - revert                    : restore an older version from seo_override_history.
 *  - bulk_fix                  : iterate audits below score threshold and auto-apply.
 *  - toggle_ab                 : enable/disable A/B testing for a path.
 *  - check_regression          : re-audit applied URLs and auto-revert if score dropped.
 *  - list_history              : return all versions for a path.
 *  - check_canonical_consistency : check robots.txt & meta robots vs proposed canonical.
 *  - one_click_canonical_fix   : generate + (optionally) apply canonical for one or all paths.
 *  - apply_manual_canonical    : admin override with explicit override of conflicts.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

type FixType = "title" | "meta" | "schema" | "alt_text" | "canonical" | "all";

const BASE_URL = "https://www.realtrust.ro";
const CANONICAL_HOST = "www.realtrust.ro";
const ALLOWED_HOSTS = new Set([CANONICAL_HOST, "realtrust.ro"]);

// ============================================================================
// Canonical normalization
// ============================================================================

function buildCanonicalUrl(input: string): string {
  let pathname = "/";
  try {
    const u = new URL(input, BASE_URL);
    pathname = u.pathname;
  } catch {
    pathname = input.startsWith("/") ? input.split("?")[0].split("#")[0] : "/";
  }
  pathname = pathname.replace(/\/{2,}/g, "/").toLowerCase();
  if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);
  return `${BASE_URL}${pathname}`;
}

function normalizePath(input: string): string {
  try {
    const u = new URL(input, BASE_URL);
    let p = u.pathname.replace(/\/{2,}/g, "/");
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    return p || "/";
  } catch {
    let p = input.startsWith("/") ? input : `/${input}`;
    p = p.replace(/\/{2,}/g, "/");
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    return p || "/";
  }
}

function detectPageType(p: string): string {
  if (p === "/" || p === "") return "homepage";
  if (p.startsWith("/proprietate/")) return "property_detail";
  if (p.startsWith("/blog/")) return "article";
  if (p.startsWith("/cartiere")) return "neighborhood";
  if (p.startsWith("/calculator-roi") || p.startsWith("/analiza-roi-apartament")) return "tool";
  return "general";
}

interface AnyBody {
  action: string;
  audit_id?: string;
  url_path?: string;
  fix_type?: FixType;
  payload?: Record<string, unknown>;
  variant?: "A" | "B";
  ab_enabled?: boolean;
  version_id?: string;
  threshold?: number;
  regression_delta?: number;
  notes?: string;
  // canonical-specific:
  canonical_url?: string;
  override_conflicts?: boolean;
  override_reason?: string;
  scope?: "single" | "bulk";
  bulk_threshold?: number;
  apply_after_check?: boolean;
  // bulk pagination + extra sources:
  offset?: number;
  limit?: number;
  include_sitemap?: boolean;
  extra_paths?: string[];
}

// ============================================================================
// HTTP entry
// ============================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = (await req.json()) as AnyBody;
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Missing auth" }, 401);
    const { data: userRes } = await sb.auth.getUser(token);
    const userId = userRes?.user?.id;
    if (!userId) return json({ error: "Invalid token" }, 401);
    const { data: roleRow } = await sb
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Forbidden" }, 403);

    switch (body.action) {
      case "generate_fix":
        return json(await generateFix(sb, body));
      case "apply_fix":
        return json(await applyFix(sb, body, userId));
      case "revert":
        return json(await revert(sb, body, userId));
      case "bulk_fix":
        return json(await bulkFix(sb, body, userId));
      case "toggle_ab":
        return json(await toggleAb(sb, body));
      case "check_regression":
        return json(await checkRegression(sb, body, userId));
      case "list_history":
        return json(await listHistory(sb, body));
      case "check_canonical_consistency":
        return json(await checkCanonicalConsistency(sb, body));
      case "one_click_canonical_fix":
        return json(await oneClickCanonicalFix(sb, body, userId));
      case "apply_manual_canonical":
        return json(await applyManualCanonical(sb, body, userId));
      case "get_robots_status":
        return json(await getRobotsStatus(sb, (body as any).host || CANONICAL_HOST));
      case "invalidate_robots_cache":
        return json(await invalidateRobotsCache(sb, (body as any).host || CANONICAL_HOST, userId, (body as any).reason || ""));
      case "refresh_robots_cache":
        return json(await refreshRobotsCache(sb, (body as any).host || CANONICAL_HOST, userId, (body as any).reason || ""));
      default:
        return json({ error: `Unknown action: ${body.action}` }, 400);
    }
  } catch (err) {
    console.error("[seo-auto-fix]", err);
    return json({ error: (err as Error).message || "Unknown error" }, 500);
  }
});

// ============================================================================
// AI helpers
// ============================================================================

async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!LOVABLE_API_KEY) throw new Error("AI not configured");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`AI ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "{}";
}

function safeJson<T = unknown>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

// ============================================================================
// Robots.txt — fetch + cache (24h) + parse
// ============================================================================

interface RobotsRule {
  user_agent: string;
  allow: string[];
  disallow: string[];
}

interface ParsedRobots {
  rules: RobotsRule[];
  sitemaps: string[];
}

function parseRobotsTxt(raw: string): ParsedRobots {
  const lines = raw.split(/\r?\n/);
  const rules: RobotsRule[] = [];
  const sitemaps: string[] = [];
  let current: RobotsRule | null = null;

  for (const line of lines) {
    const clean = line.replace(/#.*$/, "").trim();
    if (!clean) continue;
    const m = clean.match(/^([A-Za-z-]+)\s*:\s*(.+)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();

    if (key === "user-agent") {
      current = { user_agent: value, allow: [], disallow: [] };
      rules.push(current);
    } else if (key === "disallow" && current) {
      current.disallow.push(value);
    } else if (key === "allow" && current) {
      current.allow.push(value);
    } else if (key === "sitemap") {
      sitemaps.push(value);
    }
  }
  return { rules, sitemaps };
}

/** Returns true if path is blocked by robots.txt for User-agent: * */
function isPathDisallowed(parsed: ParsedRobots, path: string): { blocked: boolean; matchedRule?: string } {
  // Wildcard rule first
  const starRule = parsed.rules.find((r) => r.user_agent === "*");
  if (!starRule) return { blocked: false };

  let bestAllow = -1;
  let bestDisallow = -1;
  let matchedDisallow = "";

  for (const a of starRule.allow) {
    if (a && path.startsWith(a) && a.length > bestAllow) bestAllow = a.length;
  }
  for (const d of starRule.disallow) {
    if (!d) continue; // empty Disallow means allow-all
    if (path.startsWith(d) && d.length > bestDisallow) {
      bestDisallow = d.length;
      matchedDisallow = d;
    }
  }
  // Longest-match wins; allow ties beat disallow
  if (bestDisallow > bestAllow) return { blocked: true, matchedRule: matchedDisallow };
  return { blocked: false };
}

// Compute SHA-256 hex hash for content-change detection
async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function logRobotsEvent(sb: any, entry: {
  host: string;
  event_type: "fetch_success" | "fetch_error" | "cache_hit" | "cache_expired" | "manual_invalidation" | "manual_refresh" | "content_changed";
  http_status?: number | null;
  fetch_error?: string | null;
  raw_size?: number | null;
  rules_count?: number | null;
  sitemaps_count?: number | null;
  content_hash?: string | null;
  previous_content_hash?: string | null;
  triggered_by?: string | null;
  trigger_reason?: string | null;
}) {
  try {
    await sb.from("seo_robots_cache_log").insert({
      host: entry.host,
      event_type: entry.event_type,
      http_status: entry.http_status ?? null,
      fetch_error: entry.fetch_error ?? null,
      raw_size: entry.raw_size ?? null,
      rules_count: entry.rules_count ?? null,
      sitemaps_count: entry.sitemaps_count ?? null,
      content_hash: entry.content_hash ?? null,
      previous_content_hash: entry.previous_content_hash ?? null,
      triggered_by: entry.triggered_by ?? null,
      trigger_reason: entry.trigger_reason ?? null,
    });
  } catch (e) {
    console.warn("[robots-log] failed:", (e as Error).message);
  }
}

async function fetchRobotsLive(sb: any, host: string, prevHash: string | null, prevFetchCount: number, prevInvCount: number, prevChangeAt: string | null, triggeredBy: string | null, reason: string) {
  const url = `https://${host}/robots.txt`;
  const now = Date.now();
  let raw = "";
  let status: number | null = null;
  let error: string | null = null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    status = res.status;
    raw = await res.text();
    if (!res.ok) error = `HTTP ${status}`;
  } catch (e) {
    error = (e as Error).message;
    raw = "";
  }

  const parsed = parseRobotsTxt(raw);
  const expires = new Date(now + 24 * 60 * 60 * 1000).toISOString();
  const hash = raw ? await sha256Hex(raw) : null;
  const changed = !!hash && !!prevHash && hash !== prevHash;
  const changeAt = changed ? new Date(now).toISOString() : prevChangeAt;

  await sb.from("seo_robots_cache").upsert(
    {
      host,
      raw_content: raw,
      parsed_rules: parsed.rules as any,
      sitemap_urls: parsed.sitemaps,
      fetched_at: new Date(now).toISOString(),
      expires_at: expires,
      http_status: status,
      fetch_error: error,
      content_hash: hash,
      last_change_detected_at: changeAt,
      fetch_count: (prevFetchCount || 0) + 1,
      invalidation_count: prevInvCount || 0,
    },
    { onConflict: "host" },
  );

  await logRobotsEvent(sb, {
    host,
    event_type: error ? "fetch_error" : "fetch_success",
    http_status: status,
    fetch_error: error,
    raw_size: raw.length,
    rules_count: parsed.rules.length,
    sitemaps_count: parsed.sitemaps.length,
    content_hash: hash,
    previous_content_hash: prevHash,
    triggered_by: triggeredBy,
    trigger_reason: reason,
  });

  if (changed) {
    await logRobotsEvent(sb, {
      host,
      event_type: "content_changed",
      content_hash: hash,
      previous_content_hash: prevHash,
      triggered_by: triggeredBy,
      trigger_reason: `Content differs from previous fetch (${prevHash?.slice(0, 8)} → ${hash?.slice(0, 8)})`,
    });
  }

  return { parsed, raw, status, error, fetched_at: new Date(now).toISOString(), expires, hash, changed };
}

async function getRobotsCached(sb: any, host: string): Promise<{ parsed: ParsedRobots; cached: boolean; fetched_at: string; http_status: number | null; error: string | null; raw: string; expires_at?: string; content_hash?: string | null; changed?: boolean }> {
  const { data: cached } = await sb
    .from("seo_robots_cache")
    .select("*")
    .eq("host", host)
    .maybeSingle();

  const now = Date.now();
  if (cached && new Date(cached.expires_at).getTime() > now) {
    await logRobotsEvent(sb, { host, event_type: "cache_hit", content_hash: cached.content_hash, trigger_reason: "Cache fresh" });
    return {
      parsed: { rules: (cached.parsed_rules as any) || [], sitemaps: cached.sitemap_urls || [] },
      cached: true,
      fetched_at: cached.fetched_at,
      http_status: cached.http_status,
      error: cached.fetch_error,
      raw: cached.raw_content,
      expires_at: cached.expires_at,
      content_hash: cached.content_hash,
    };
  }

  if (cached) {
    await logRobotsEvent(sb, {
      host,
      event_type: "cache_expired",
      previous_content_hash: cached.content_hash,
      trigger_reason: `Cache expired at ${cached.expires_at}`,
    });
  }

  const live = await fetchRobotsLive(
    sb,
    host,
    cached?.content_hash ?? null,
    cached?.fetch_count ?? 0,
    cached?.invalidation_count ?? 0,
    cached?.last_change_detected_at ?? null,
    null,
    cached ? "Auto-refresh after cache expiry" : "Initial fetch (no cache)",
  );

  return {
    parsed: live.parsed,
    cached: false,
    fetched_at: live.fetched_at,
    http_status: live.status,
    error: live.error,
    raw: live.raw,
    expires_at: live.expires,
    content_hash: live.hash,
    changed: live.changed,
  };
}

// ============================================================================
// Robots cache management actions
// ============================================================================

async function getRobotsStatus(sb: any, host: string) {
  const { data: cache } = await sb
    .from("seo_robots_cache")
    .select("*")
    .eq("host", host)
    .maybeSingle();

  const { data: log } = await sb
    .from("seo_robots_cache_log")
    .select("*")
    .eq("host", host)
    .order("created_at", { ascending: false })
    .limit(20);

  const now = Date.now();
  let status: "fresh" | "stale" | "missing" | "error" = "missing";
  let age_seconds: number | null = null;
  let ttl_seconds: number | null = null;
  if (cache) {
    age_seconds = Math.round((now - new Date(cache.fetched_at).getTime()) / 1000);
    ttl_seconds = Math.round((new Date(cache.expires_at).getTime() - now) / 1000);
    if (cache.fetch_error) status = "error";
    else if (ttl_seconds <= 0) status = "stale";
    else status = "fresh";
  }

  return {
    ok: true,
    host,
    cache: cache
      ? {
          fetched_at: cache.fetched_at,
          expires_at: cache.expires_at,
          http_status: cache.http_status,
          fetch_error: cache.fetch_error,
          content_hash: cache.content_hash,
          last_change_detected_at: cache.last_change_detected_at,
          rules_count: Array.isArray(cache.parsed_rules) ? cache.parsed_rules.length : 0,
          sitemaps_count: (cache.sitemap_urls || []).length,
          raw_size: (cache.raw_content || "").length,
          fetch_count: cache.fetch_count || 0,
          invalidation_count: cache.invalidation_count || 0,
        }
      : null,
    status,
    age_seconds,
    ttl_seconds,
    log: log || [],
  };
}

async function invalidateRobotsCache(sb: any, host: string, userId: string, reason: string) {
  const { data: cache } = await sb
    .from("seo_robots_cache")
    .select("content_hash, invalidation_count")
    .eq("host", host)
    .maybeSingle();

  // Force expiration: set expires_at in the past + bump invalidation count
  await sb
    .from("seo_robots_cache")
    .update({
      expires_at: new Date(Date.now() - 1000).toISOString(),
      invalidation_count: (cache?.invalidation_count || 0) + 1,
    })
    .eq("host", host);

  await logRobotsEvent(sb, {
    host,
    event_type: "manual_invalidation",
    previous_content_hash: cache?.content_hash ?? null,
    triggered_by: userId,
    trigger_reason: reason || "Manual invalidation by admin",
  });

  return { ok: true, host, invalidated: true };
}

async function refreshRobotsCache(sb: any, host: string, userId: string, reason: string) {
  const { data: cache } = await sb
    .from("seo_robots_cache")
    .select("content_hash, fetch_count, invalidation_count, last_change_detected_at")
    .eq("host", host)
    .maybeSingle();

  await logRobotsEvent(sb, {
    host,
    event_type: "manual_refresh",
    previous_content_hash: cache?.content_hash ?? null,
    triggered_by: userId,
    trigger_reason: reason || "Manual refresh requested by admin",
  });

  const live = await fetchRobotsLive(
    sb,
    host,
    cache?.content_hash ?? null,
    cache?.fetch_count ?? 0,
    cache?.invalidation_count ?? 0,
    cache?.last_change_detected_at ?? null,
    userId,
    reason || "Manual refresh",
  );

  return {
    ok: true,
    host,
    refreshed: true,
    fetched_at: live.fetched_at,
    expires_at: live.expires,
    http_status: live.status,
    fetch_error: live.error,
    content_changed: live.changed,
    content_hash: live.hash,
    rules_count: live.parsed.rules.length,
    sitemaps_count: live.parsed.sitemaps.length,
  };
}

// ============================================================================
// generate_fix
// ============================================================================

async function generateFix(sb: any, body: AnyBody) {
  if (!body.audit_id) throw new Error("audit_id required");
  const fixType: FixType = body.fix_type || "all";

  const { data: audit, error } = await sb
    .from("seo_audits")
    .select("*")
    .eq("id", body.audit_id)
    .maybeSingle();
  if (error || !audit) throw new Error("Audit not found");

  const path = normalizePath(audit.url);
  const pageType = detectPageType(path);

  const baseContext = `
URL: ${audit.url}
PageType: ${pageType}
Language: ${audit.language}
CurrentTitle: ${audit.title || "(none)"}
CurrentMeta: ${audit.meta_description || "(none)"}
Score: ${audit.overall_score}/100
Issues: ${JSON.stringify(audit.issues || []).slice(0, 1500)}
KeywordGaps: ${JSON.stringify(audit.keyword_gaps || []).slice(0, 800)}
LocalEntitiesMissing: ${JSON.stringify(audit.local_entities_missing || []).slice(0, 600)}
`.trim();

  const suggestedCanonical = buildCanonicalUrl(audit.url);
  const currentCanonicalCandidate = (audit as any).canonical_url || (audit as any).meta?.canonical || null;

  const fixInstructions: Record<FixType, string> = {
    title:
      "Generate ONLY a new title (50-60 chars, RO, with primary local keyword). Output JSON: {\"title\": \"...\"}",
    meta:
      "Generate ONLY a new meta description (140-155 chars, RO, with CTA, local keyword). Output JSON: {\"meta_description\": \"...\"}",
    schema:
      `Generate Schema.org JSON-LD appropriate for pageType="${pageType}". Pick the best @type (LocalBusiness/RealEstateAgent for homepage; Product/RealEstateListing for property; Article for blog; Place for neighborhood). Include name, description, url, image, address (Timișoara, RO), telephone "+40799069256", email "info@realtrust.ro" where applicable. Output JSON: {"json_ld": { ... }}`,
    alt_text:
      "Suggest alt-text for up to 8 likely images on this page (hero, gallery, property thumbs). Output JSON: {\"alt_text_suggestions\": [{\"image_hint\": \"hero\", \"alt\": \"...\"}, ...]}",
    canonical:
      `Propose the correct absolute canonical URL for this page. Rules: must use https://${CANONICAL_HOST} as origin (strip subdomains like preview/lovable/staging), lowercase pathname, NO query params, NO hash, NO trailing slash (except root). Detected pageType="${pageType}". Suggested baseline (already normalized): "${suggestedCanonical}". Current canonical found on the page (if any): "${currentCanonicalCandidate || "(none)"}". If the suggested baseline is correct, return it as-is. If the page is a duplicate / pagination / filter variant, propose the canonical of the master page instead. Also explain in 1 short Romanian sentence why. Output JSON: {"canonical_url": "https://${CANONICAL_HOST}/...", "canonical_reason": "..."}`,
    all:
      `Generate a complete SEO fix bundle. Output JSON: {"title": "...", "meta_description": "...", "canonical_url": "${suggestedCanonical}", "json_ld": { schema.org object appropriate for pageType="${pageType}", with @context, @type, name, description, url, image, address (Timișoara), telephone "+40799069256" }, "extra_keywords": [{"keyword": "...", "reason": "..."}, ...]}. All copy in RO. Title 50-60 chars. Meta 140-155 chars. canonical_url MUST be the normalized absolute URL on https://${CANONICAL_HOST} (no query, no hash, no trailing slash).`,
  };

  const system = `You are an expert SEO engineer for a Romanian real estate brand "RealTrust & ApArt Hotel" in Timișoara. Output ONLY valid JSON, no prose. Brand voice: professional, trustworthy, ROI-focused (9.4% net). Always favor local keywords (Timișoara, neighborhood names like Iosefin, Iulius Town, Complex Studențesc, Dumbrăvița, Giroc, ISHO, Aeroport, UVT). Phone: +40799069256. Email: info@realtrust.ro.`;
  const user = `${baseContext}\n\nTASK: ${fixInstructions[fixType]}`;

  const raw = await callGemini(system, user);
  const parsed = (safeJson<Record<string, unknown>>(raw) || {}) as Record<string, unknown>;

  // ── Normalize Gemini output to expected shape ─────────────────────────────
  // For "schema" fix: accept either { json_ld: {...} } OR a bare schema.org object
  // (i.e. one that has @context / @type at top level) — wrap it.
  if (fixType === "schema") {
    const hasJsonLd = parsed.json_ld && typeof parsed.json_ld === "object";
    const looksLikeSchema =
      !hasJsonLd &&
      ((parsed as any)["@context"] || (parsed as any)["@type"]);
    if (!hasJsonLd && looksLikeSchema) {
      const bare = { ...parsed };
      // Remove non-schema keys we may have added later
      parsed.json_ld = bare;
    }
    // Final safety net: if still no json_ld, build a minimal LocalBusiness
    if (!parsed.json_ld) {
      parsed.json_ld = {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "name": "RealTrust & ApArt Hotel Timișoara",
        "url": `https://${CANONICAL_HOST}${path}`,
        "telephone": "+40799069256",
        "email": "info@realtrust.ro",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Timișoara",
          "addressRegion": "Timiș",
          "addressCountry": "RO",
        },
      };
    }
  }

  // For "alt_text" fix: accept either { alt_text_suggestions: [...] } OR a bare array
  if (fixType === "alt_text") {
    if (!parsed.alt_text_suggestions && Array.isArray((parsed as any).suggestions)) {
      parsed.alt_text_suggestions = (parsed as any).suggestions;
    }
    if (!Array.isArray(parsed.alt_text_suggestions)) {
      parsed.alt_text_suggestions = [];
    }
  }

  if ((parsed as any).canonical_url) {
    (parsed as any).canonical_url = buildCanonicalUrl(String((parsed as any).canonical_url));
  } else if (fixType === "canonical" || fixType === "all") {
    (parsed as any).canonical_url = suggestedCanonical;
  }

  return {
    fix_type: fixType,
    url_path: path,
    page_type: pageType,
    suggested_canonical: suggestedCanonical,
    current_canonical: currentCanonicalCandidate,
    proposal: parsed,
  };
}

// ============================================================================
// apply_fix
// ============================================================================

async function applyFix(sb: any, body: AnyBody, userId: string) {
  if (!body.url_path || !body.payload) throw new Error("url_path & payload required");
  const path = normalizePath(body.url_path);
  const variant = body.variant || "A";

  const { data: current } = await sb
    .from("seo_overrides")
    .select("*")
    .eq("url_path", path)
    .maybeSingle();

  let nextVersion = 1;
  if (current) {
    const { data: lastVer } = await sb
      .from("seo_override_history")
      .select("version_number")
      .eq("url_path", path)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    nextVersion = (lastVer?.version_number || 0) + 1;

    await sb.from("seo_override_history").insert({
      url_path: path,
      version_number: nextVersion,
      title: current.title,
      meta_description: current.meta_description,
      json_ld: current.json_ld,
      extra_keywords: current.extra_keywords || [],
      alt_text_suggestions: current.alt_text_suggestions || [],
      canonical_url: current.canonical_url ?? null,
      source_audit_id: current.source_audit_id,
      score_before: null,
      score_after: null,
      change_type: "snapshot_before_apply",
      applied_by: userId,
      notes: body.notes || null,
    });
  }

  const p = body.payload as any;
  if (p && p.canonical_url) {
    p.canonical_url = buildCanonicalUrl(String(p.canonical_url));
  }

  if (variant === "B") {
    const variantB: Record<string, unknown> = {
      title: p.title ?? current?.title ?? null,
      meta_description: p.meta_description ?? current?.meta_description ?? null,
      json_ld: p.json_ld ?? current?.json_ld ?? null,
      extra_keywords: p.extra_keywords ?? current?.extra_keywords ?? [],
    };
    if (p.canonical_url !== undefined) variantB.canonical_url = p.canonical_url;
    if (current) {
      await sb
        .from("seo_overrides")
        .update({
          ab_variant_b: variantB,
          ab_enabled: body.ab_enabled ?? true,
          updated_at: new Date().toISOString(),
        })
        .eq("url_path", path);
    } else {
      await sb.from("seo_overrides").insert({
        url_path: path,
        title: variantB.title,
        meta_description: variantB.meta_description,
        json_ld: variantB.json_ld,
        extra_keywords: variantB.extra_keywords,
        canonical_url: p.canonical_url ?? null,
        ab_variant_b: variantB,
        ab_enabled: body.ab_enabled ?? true,
        applied_by: userId,
      });
    }
    return { ok: true, variant: "B", version: nextVersion };
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    applied_by: userId,
    applied_at: new Date().toISOString(),
    is_active: true,
  };
  if (p.title !== undefined) updates.title = p.title;
  if (p.meta_description !== undefined) updates.meta_description = p.meta_description;
  if (p.json_ld !== undefined) updates.json_ld = p.json_ld;
  if (p.extra_keywords !== undefined) updates.extra_keywords = p.extra_keywords;
  if (p.alt_text_suggestions !== undefined) updates.alt_text_suggestions = p.alt_text_suggestions;
  if (p.canonical_url !== undefined) updates.canonical_url = p.canonical_url;
  if (body.audit_id) updates.source_audit_id = body.audit_id;

  if (current) {
    await sb.from("seo_overrides").update(updates).eq("url_path", path);
  } else {
    await sb.from("seo_overrides").insert({
      url_path: path,
      title: p.title ?? null,
      meta_description: p.meta_description ?? null,
      json_ld: p.json_ld ?? null,
      extra_keywords: p.extra_keywords ?? [],
      alt_text_suggestions: p.alt_text_suggestions ?? [],
      canonical_url: p.canonical_url ?? null,
      source_audit_id: body.audit_id ?? null,
      applied_by: userId,
    });
  }
  return { ok: true, variant: "A", version: nextVersion, canonical_url: p.canonical_url ?? null };
}

// ============================================================================
// revert
// ============================================================================

async function revert(sb: any, body: AnyBody, userId: string) {
  if (!body.version_id) throw new Error("version_id required");
  const { data: ver, error } = await sb
    .from("seo_override_history")
    .select("*")
    .eq("id", body.version_id)
    .maybeSingle();
  if (error || !ver) throw new Error("Version not found");

  const { data: current } = await sb
    .from("seo_overrides")
    .select("*")
    .eq("url_path", ver.url_path)
    .maybeSingle();

  if (current) {
    const { data: lastVer } = await sb
      .from("seo_override_history")
      .select("version_number")
      .eq("url_path", ver.url_path)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    await sb.from("seo_override_history").insert({
      url_path: ver.url_path,
      version_number: (lastVer?.version_number || 0) + 1,
      title: current.title,
      meta_description: current.meta_description,
      json_ld: current.json_ld,
      extra_keywords: current.extra_keywords || [],
      alt_text_suggestions: current.alt_text_suggestions || [],
      canonical_url: current.canonical_url ?? null,
      source_audit_id: current.source_audit_id,
      change_type: "snapshot_before_revert",
      applied_by: userId,
    });
  }

  await sb
    .from("seo_overrides")
    .update({
      title: ver.title,
      meta_description: ver.meta_description,
      json_ld: ver.json_ld,
      extra_keywords: ver.extra_keywords || [],
      alt_text_suggestions: ver.alt_text_suggestions || [],
      canonical_url: ver.canonical_url ?? null,
      updated_at: new Date().toISOString(),
      applied_by: userId,
      applied_at: new Date().toISOString(),
      is_active: true,
    })
    .eq("url_path", ver.url_path);

  await sb
    .from("seo_override_history")
    .update({ reverted_at: new Date().toISOString() })
    .eq("id", body.version_id);

  return { ok: true, reverted_to_version: ver.version_number };
}

// ============================================================================
// bulk_fix
// ============================================================================

async function bulkFix(sb: any, body: AnyBody, userId: string) {
  const threshold = body.threshold ?? 85;
  const { data: audits } = await sb
    .from("seo_audits")
    .select("id, url, overall_score, created_at")
    .lt("overall_score", threshold)
    .order("created_at", { ascending: false })
    .limit(50);

  const seen = new Set<string>();
  const targets = (audits || []).filter((a: any) => {
    if (seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });

  const results: any[] = [];
  for (const audit of targets) {
    try {
      const fix = await generateFix(sb, { action: "generate_fix", audit_id: audit.id, fix_type: "all" });
      const path = normalizePath(audit.url);
      await applyFix(sb, {
        action: "apply_fix",
        url_path: path,
        payload: fix.proposal,
        audit_id: audit.id,
        notes: `Bulk auto-fix (score was ${audit.overall_score})`,
      } as AnyBody, userId);
      results.push({ url: audit.url, status: "ok" });
    } catch (e) {
      results.push({ url: audit.url, status: "error", error: (e as Error).message });
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  return { ok: true, processed: results.length, results };
}

// ============================================================================
// toggle_ab / check_regression / list_history
// ============================================================================

async function toggleAb(sb: any, body: AnyBody) {
  if (!body.url_path) throw new Error("url_path required");
  const path = normalizePath(body.url_path);
  await sb
    .from("seo_overrides")
    .update({ ab_enabled: !!body.ab_enabled, updated_at: new Date().toISOString() })
    .eq("url_path", path);
  return { ok: true, ab_enabled: !!body.ab_enabled };
}

async function checkRegression(sb: any, body: AnyBody, userId: string) {
  const delta = body.regression_delta ?? 5;
  const { data: overrides } = await sb
    .from("seo_overrides")
    .select("url_path, applied_at, source_audit_id")
    .eq("is_active", true)
    .limit(100);

  const reverts: any[] = [];
  for (const ov of overrides || []) {
    const { data: srcAudit } = ov.source_audit_id
      ? await sb.from("seo_audits").select("overall_score").eq("id", ov.source_audit_id).maybeSingle()
      : { data: null };
    const baseline = srcAudit?.overall_score;
    if (!baseline) continue;
    const fullUrl = `${BASE_URL}${ov.url_path}`;
    const { data: latest } = await sb
      .from("seo_audits")
      .select("id, overall_score, created_at")
      .eq("url", fullUrl)
      .gt("created_at", ov.applied_at)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!latest?.overall_score) continue;
    if (baseline - latest.overall_score >= delta) {
      const { data: prevVer } = await sb
        .from("seo_override_history")
        .select("id, version_number")
        .eq("url_path", ov.url_path)
        .is("reverted_at", null)
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (prevVer) {
        await revert(sb, { action: "revert", version_id: prevVer.id }, userId);
        reverts.push({ url_path: ov.url_path, baseline, current: latest.overall_score, reverted_to: prevVer.version_number });
      }
    }
  }
  if (reverts.length > 0) {
    await sendRegressionAlert(sb, reverts).catch((e) => console.warn("[regression-alert]", e));
  }
  return { ok: true, reverts };
}

async function sendRegressionAlert(sb: any, reverts: any[]) {
  const RESEND = Deno.env.get("RESEND_API_KEY");
  const LOVABLE = Deno.env.get("LOVABLE_API_KEY");
  if (!RESEND || !LOVABLE) {
    console.warn("[regression-alert] missing keys");
    return;
  }
  const { data: admins } = await sb
    .from("profiles")
    .select("email, id")
    .in("id",
      ((await sb.from("user_roles").select("user_id").eq("role", "admin")).data || []).map((r: any) => r.user_id),
    );
  const recipients = (admins || []).map((a: any) => a.email).filter(Boolean);
  if (recipients.length === 0) return;
  const rows = reverts.map((r: any) => `<tr><td style="padding:8px;border-bottom:1px solid #eee"><code>${r.url_path}</code></td><td style="padding:8px;border-bottom:1px solid #eee">${r.baseline} → ${r.current}</td><td style="padding:8px;border-bottom:1px solid #eee">v${r.reverted_to}</td></tr>`).join("");
  const html = `
    <div style="font-family:Inter,system-ui,sans-serif;max-width:640px;margin:0 auto;color:#0f172a">
      <h2 style="color:#b91c1c;margin:0 0 8px">⚠️ Auto-Revert SEO declanșat</h2>
      <p>Au fost detectate <strong>${reverts.length}</strong> regresii SEO pe paginile cu override aplicat. Sistemul a revenit automat la versiunea anterioară pentru fiecare.</p>
      <table style="border-collapse:collapse;width:100%;font-size:14px;margin:16px 0">
        <thead><tr style="background:#f8fafc"><th align="left" style="padding:8px;border-bottom:2px solid #e2e8f0">Pagină</th><th align="left" style="padding:8px;border-bottom:2px solid #e2e8f0">Scor</th><th align="left" style="padding:8px;border-bottom:2px solid #e2e8f0">Revert la</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="font-size:12px;color:#64748b">Verifică panoul SEO Optimizer pentru detalii complete.</p>
    </div>`;
  await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE}`,
      "X-Connection-Api-Key": RESEND,
    },
    body: JSON.stringify({
      from: "RealTrust SEO <onboarding@resend.dev>",
      to: recipients,
      subject: `⚠️ ${reverts.length} regresii SEO auto-revertite`,
      html,
    }),
  });
}

async function listHistory(sb: any, body: AnyBody) {
  if (!body.url_path) throw new Error("url_path required");
  const path = normalizePath(body.url_path);
  const { data } = await sb
    .from("seo_override_history")
    .select("*")
    .eq("url_path", path)
    .order("version_number", { ascending: false })
    .limit(50);
  return { ok: true, history: data || [] };
}

// ============================================================================
// CANONICAL CONSISTENCY CHECK
// ============================================================================

interface ConflictReport {
  type: "robots_disallow" | "meta_noindex" | "host_mismatch" | "self_canonical_to_blocked" | "host_not_allowed" | "https_required";
  severity: "critical" | "warning";
  message: string;
  details?: Record<string, unknown>;
}

async function checkCanonicalConsistency(sb: any, body: AnyBody) {
  if (!body.url_path && !body.canonical_url) throw new Error("url_path or canonical_url required");

  const path = body.url_path ? normalizePath(body.url_path) : null;
  const proposedCanonical = body.canonical_url
    ? buildCanonicalUrl(body.canonical_url)
    : path ? buildCanonicalUrl(path) : "";

  const conflicts: ConflictReport[] = [];

  // 1) Validate scheme + host
  let canonicalUrl: URL | null = null;
  try {
    canonicalUrl = new URL(proposedCanonical);
  } catch {
    conflicts.push({
      type: "host_not_allowed",
      severity: "critical",
      message: "URL canonical invalid (nu poate fi parsat).",
    });
  }
  if (canonicalUrl) {
    if (canonicalUrl.protocol !== "https:") {
      conflicts.push({
        type: "https_required",
        severity: "critical",
        message: "Canonical trebuie să fie HTTPS.",
      });
    }
    if (!ALLOWED_HOSTS.has(canonicalUrl.hostname)) {
      conflicts.push({
        type: "host_not_allowed",
        severity: "critical",
        message: `Host "${canonicalUrl.hostname}" nu este permis. Folosește ${CANONICAL_HOST}.`,
      });
    }
  }

  // 2) robots.txt check (cached 24h)
  const checkPath = canonicalUrl?.pathname || path || "/";
  const robotsInfo = await getRobotsCached(sb, CANONICAL_HOST);
  const robotsCheck = isPathDisallowed(robotsInfo.parsed, checkPath);
  if (robotsCheck.blocked) {
    conflicts.push({
      type: "robots_disallow",
      severity: "critical",
      message: `Pagina este blocată în robots.txt prin regula "Disallow: ${robotsCheck.matchedRule}". Canonical-ul nu va avea efect — Google nu va crawl-a pagina.`,
      details: { matched_rule: robotsCheck.matchedRule },
    });
  }

  // 3) Check meta robots from latest audit (if path provided)
  let metaRobots: string | null = null;
  if (path) {
    const fullUrl = `${BASE_URL}${path}`;
    const { data: latestAudit } = await sb
      .from("seo_audits")
      .select("raw_analysis, meta")
      .eq("url", fullUrl)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    metaRobots =
      (latestAudit as any)?.meta?.robots ||
      (latestAudit as any)?.raw_analysis?.meta_robots ||
      (latestAudit as any)?.raw_analysis?.robots ||
      null;
    if (metaRobots && /noindex/i.test(metaRobots)) {
      conflicts.push({
        type: "meta_noindex",
        severity: "critical",
        message: `Pagina are meta robots="${metaRobots}". Setarea unui canonical pe o pagină noindex este contradictorie.`,
        details: { meta_robots: metaRobots },
      });
    }
  }

  return {
    ok: true,
    proposed_canonical: proposedCanonical,
    url_path: path,
    conflicts,
    has_critical: conflicts.some((c) => c.severity === "critical"),
    robots: {
      cached: robotsInfo.cached,
      fetched_at: robotsInfo.fetched_at,
      http_status: robotsInfo.http_status,
      error: robotsInfo.error,
      sitemaps: robotsInfo.parsed.sitemaps,
    },
    meta_robots: metaRobots,
  };
}

// ============================================================================
// ONE-CLICK CANONICAL FIX (single page or bulk)
// ============================================================================

async function oneClickCanonicalFix(sb: any, body: AnyBody, userId: string) {
  const scope = body.scope || "single";
  const apply = body.apply_after_check !== false; // default true
  const overrideConflicts = !!body.override_conflicts;

  if (scope === "single") {
    if (!body.url_path && !body.audit_id) throw new Error("url_path or audit_id required");
    let path = body.url_path ? normalizePath(body.url_path) : "";
    let auditId = body.audit_id || null;

    if (!path && auditId) {
      const { data: a } = await sb.from("seo_audits").select("url").eq("id", auditId).maybeSingle();
      if (a?.url) path = normalizePath(a.url);
    }
    const proposed = buildCanonicalUrl(path);
    const consistency = await checkCanonicalConsistency(sb, { action: "check_canonical_consistency", url_path: path, canonical_url: proposed });

    if (consistency.has_critical && !overrideConflicts) {
      return {
        ok: false,
        applied: false,
        reason: "conflicts_detected",
        proposed_canonical: proposed,
        conflicts: consistency.conflicts,
        meta_robots: consistency.meta_robots,
      };
    }

    if (!apply) {
      return {
        ok: true,
        applied: false,
        proposed_canonical: proposed,
        conflicts: consistency.conflicts,
      };
    }

    // Get current canonical for log
    const { data: existing } = await sb
      .from("seo_overrides")
      .select("canonical_url")
      .eq("url_path", path)
      .maybeSingle();

    await applyFix(
      sb,
      {
        action: "apply_fix",
        url_path: path,
        payload: { canonical_url: proposed },
        audit_id: auditId || undefined,
        notes: overrideConflicts ? `One-click + override conflicts: ${body.override_reason || "no reason"}` : "One-click canonical fix",
      } as AnyBody,
      userId,
    );

    await sb.from("seo_canonical_fix_log").insert({
      url_path: path,
      previous_canonical: existing?.canonical_url || null,
      new_canonical: proposed,
      fix_source: "one_click_single",
      conflicts_detected: consistency.conflicts as any,
      conflict_overridden: overrideConflicts && consistency.has_critical,
      override_reason: overrideConflicts ? body.override_reason || null : null,
      applied_by: userId,
    });

    return {
      ok: true,
      applied: true,
      proposed_canonical: proposed,
      conflicts: consistency.conflicts,
      override_used: overrideConflicts && consistency.has_critical,
    };
  }

  // BULK
  const threshold = body.bulk_threshold ?? 90;
  const offset = Math.max(0, body.offset ?? 0);
  const limit = Math.min(Math.max(1, body.limit ?? 50), 100);

  // Gather candidate URLs from multiple sources so bulk still works even when
  // seo_audits is empty (fresh project) or thin.
  const urlSet = new Set<string>();

  const { data: audits } = await sb
    .from("seo_audits")
    .select("id, url, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  const auditByPath = new Map<string, string>(); // path -> audit id
  for (const a of audits || []) {
    const p = normalizePath(a.url);
    if (!auditByPath.has(p)) auditByPath.set(p, a.id);
    urlSet.add(p);
  }

  // Also include every path that already has an override row (keeps them normalized).
  const { data: existingOverrides } = await sb
    .from("seo_overrides")
    .select("url_path")
    .limit(500);
  for (const o of existingOverrides || []) urlSet.add(normalizePath(o.url_path));

  // Optional caller-provided paths (e.g. from sitemap on the client).
  for (const p of body.extra_paths || []) {
    if (typeof p === "string" && p.startsWith("/")) urlSet.add(normalizePath(p));
  }

  // Fallback sitemap ingestion (server-side) when explicitly asked.
  if (body.include_sitemap) {
    try {
      const res = await fetch(`${BASE_URL}/sitemap.xml`, { redirect: "follow" });
      if (res.ok) {
        const xml = await res.text();
        const matches = xml.match(/<loc>([^<]+)<\/loc>/g) || [];
        for (const m of matches) {
          const loc = m.replace(/<\/?loc>/g, "").trim();
          try {
            const u = new URL(loc);
            if (ALLOWED_HOSTS.has(u.hostname)) urlSet.add(normalizePath(u.pathname));
          } catch { /* skip */ }
        }
      }
    } catch (_e) { /* soft fail */ }
  }

  const allPaths = Array.from(urlSet).sort();
  const total = allPaths.length;
  const slice = allPaths.slice(offset, offset + limit);

  // Preload existing overrides for this slice in ONE query (avoid N per-row selects).
  const { data: existingRows } = await sb
    .from("seo_overrides")
    .select("url_path, canonical_url")
    .in("url_path", slice);
  const existingMap = new Map<string, string | null>(
    (existingRows || []).map((r: any) => [r.url_path, r.canonical_url ?? null]),
  );

  // Warm robots cache once so parallel checks don't stampede.
  try { await getRobotsCached(sb, CANONICAL_HOST); } catch (_e) { /* ignore */ }

  const CONCURRENCY = 6;
  const results: any[] = new Array(slice.length);

  async function processOne(idx: number) {
    const path = slice[idx];
    try {
      const proposed = buildCanonicalUrl(path);
      const existingCanonical = existingMap.get(path) ?? null;
      if (existingCanonical === proposed) {
        results[idx] = { url_path: path, status: "skipped", reason: "already_correct" };
        return;
      }

      const consistency = await checkCanonicalConsistency(sb, {
        action: "check_canonical_consistency",
        url_path: path,
        canonical_url: proposed,
      });
      if (consistency.has_critical && !overrideConflicts) {
        results[idx] = {
          url_path: path,
          status: "skipped",
          reason: "conflicts",
          conflicts: consistency.conflicts.map((c) => c.type),
        };
        return;
      }

      const auditId = auditByPath.get(path);
      await applyFix(
        sb,
        {
          action: "apply_fix",
          url_path: path,
          payload: { canonical_url: proposed },
          audit_id: auditId,
          notes: overrideConflicts
            ? `Bulk one-click + override: ${body.override_reason || "no reason"}`
            : "Bulk one-click canonical fix",
        } as AnyBody,
        userId,
      );
      await sb.from("seo_canonical_fix_log").insert({
        url_path: path,
        previous_canonical: existingCanonical,
        new_canonical: proposed,
        fix_source: "one_click_bulk",
        conflicts_detected: consistency.conflicts as any,
        conflict_overridden: overrideConflicts && consistency.has_critical,
        override_reason: overrideConflicts ? body.override_reason || null : null,
        applied_by: userId,
      });
      results[idx] = { url_path: path, status: "ok", canonical: proposed };
    } catch (e) {
      results[idx] = { url_path: path, status: "error", error: (e as Error).message };
    }
  }

  // Simple concurrency pool.
  let cursor = 0;
  const workers: Promise<void>[] = [];
  for (let w = 0; w < CONCURRENCY; w++) {
    workers.push((async () => {
      while (true) {
        const i = cursor++;
        if (i >= slice.length) return;
        await processOne(i);
      }
    })());
  }
  await Promise.all(workers);

  const nextOffset = offset + slice.length;
  return {
    ok: true,
    scope: "bulk",
    threshold,
    total,
    offset,
    limit,
    next_offset: nextOffset < total ? nextOffset : null,
    done: nextOffset >= total,
    processed: results.length,
    applied: results.filter((r) => r.status === "ok").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    errors: results.filter((r) => r.status === "error").length,
    results,
  };
}

// ============================================================================
// MANUAL CANONICAL OVERRIDE (admin types URL directly)
// ============================================================================

async function applyManualCanonical(sb: any, body: AnyBody, userId: string) {
  if (!body.url_path) throw new Error("url_path required");
  if (!body.canonical_url) throw new Error("canonical_url required");

  const path = normalizePath(body.url_path);
  const normalized = buildCanonicalUrl(body.canonical_url);

  const consistency = await checkCanonicalConsistency(sb, {
    action: "check_canonical_consistency",
    url_path: path,
    canonical_url: normalized,
  });

  if (consistency.has_critical && !body.override_conflicts) {
    return {
      ok: false,
      applied: false,
      reason: "conflicts_detected",
      proposed_canonical: normalized,
      conflicts: consistency.conflicts,
    };
  }

  const { data: existing } = await sb
    .from("seo_overrides")
    .select("canonical_url")
    .eq("url_path", path)
    .maybeSingle();

  await applyFix(
    sb,
    {
      action: "apply_fix",
      url_path: path,
      payload: { canonical_url: normalized },
      audit_id: body.audit_id,
      notes: `Manual canonical override${body.override_conflicts ? " (conflicts overridden)" : ""}`,
    } as AnyBody,
    userId,
  );

  await sb.from("seo_canonical_fix_log").insert({
    url_path: path,
    previous_canonical: existing?.canonical_url || null,
    new_canonical: normalized,
    fix_source: "manual_override",
    conflicts_detected: consistency.conflicts as any,
    conflict_overridden: !!body.override_conflicts && consistency.has_critical,
    override_reason: body.override_reason || null,
    applied_by: userId,
  });

  return {
    ok: true,
    applied: true,
    proposed_canonical: normalized,
    conflicts: consistency.conflicts,
    override_used: !!body.override_conflicts && consistency.has_critical,
  };
}
