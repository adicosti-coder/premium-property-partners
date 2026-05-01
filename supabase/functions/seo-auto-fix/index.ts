/**
 * SEO Auto-Fix & Version Control
 *
 * Actions:
 *  - generate_fix    : ask Gemini to produce a fix for a specific issue (title|meta|schema|alt_text|all)
 *                      Returns proposed payload WITHOUT writing anything.
 *  - apply_fix       : write proposal into seo_overrides + create history snapshot.
 *                      Optionally apply as variant B (A/B testing).
 *  - revert          : restore an older version from seo_override_history.
 *  - bulk_fix        : iterate through audits below a score threshold and auto-apply fixes.
 *  - toggle_ab       : enable/disable A/B testing for a path.
 *  - check_regression: re-audit applied URLs and auto-revert if score dropped > delta.
 *  - list_history    : return all versions for a path.
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

/**
 * Build a normalized, absolute canonical URL from any input (path, full URL, with/without query).
 * Rules:
 *  - Always https + www.realtrust.ro host (strip subdomains like preview/lovable)
 *  - Lowercase pathname (Romanian routes are lowercase by convention)
 *  - Strip trailing slash (except root), collapse duplicate slashes
 *  - Remove all query params and hash (canonical must be parameter-free)
 */
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
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = (await req.json()) as AnyBody;
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Admin gate via JWT
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
      default:
        return json({ error: `Unknown action: ${body.action}` }, 400);
    }
  } catch (err) {
    console.error("[seo-auto-fix]", err);
    return json({ error: (err as Error).message || "Unknown error" }, 500);
  }
});

// ============================================================================
// Helpers
// ============================================================================

function normalizePath(input: string): string {
  try {
    const u = new URL(input, "https://www.realtrust.ro");
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
  if (p.startsWith("/imobiliare-timisoara")) return "neighborhood";
  if (p.startsWith("/calculator-roi") || p.startsWith("/analiza-roi-apartament")) return "tool";
  return "general";
}

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
      `Propose the correct absolute canonical URL for this page. Rules: must use https://www.realtrust.ro as origin (strip subdomains like preview/lovable/staging), lowercase pathname, NO query params, NO hash, NO trailing slash (except root). Detected pageType="${pageType}". Suggested baseline (already normalized): "${suggestedCanonical}". Current canonical found on the page (if any): "${currentCanonicalCandidate || "(none)"}". If the suggested baseline is correct, return it as-is. If the page is a duplicate / pagination / filter variant, propose the canonical of the master page instead. Also explain in 1 short Romanian sentence why. Output JSON: {"canonical_url": "https://www.realtrust.ro/...", "canonical_reason": "..."}`,
    all:
      `Generate a complete SEO fix bundle. Output JSON: {"title": "...", "meta_description": "...", "canonical_url": "${suggestedCanonical}", "json_ld": { schema.org object appropriate for pageType="${pageType}", with @context, @type, name, description, url, image, address (Timișoara), telephone "+40799069256" }, "extra_keywords": [{"keyword": "...", "reason": "..."}, ...]}. All copy in RO. Title 50-60 chars. Meta 140-155 chars. canonical_url MUST be the normalized absolute URL on https://www.realtrust.ro (no query, no hash, no trailing slash).`,
  };

  const system = `You are an expert SEO engineer for a Romanian real estate brand "RealTrust & ApArt Hotel" in Timișoara. Output ONLY valid JSON, no prose. Brand voice: professional, trustworthy, ROI-focused (9.4% net). Always favor local keywords (Timișoara, neighborhood names like Iosefin, Iulius Town, Complex Studențesc, Dumbrăvița, Giroc, ISHO, Aeroport, UVT). Phone: +40799069256. Email: info@realtrust.ro.`;
  const user = `${baseContext}\n\nTASK: ${fixInstructions[fixType]}`;

  const raw = await callGemini(system, user);
  const parsed = safeJson<Record<string, unknown>>(raw) || {};

  return { fix_type: fixType, url_path: path, page_type: pageType, proposal: parsed };
}

// ============================================================================
// apply_fix
// ============================================================================

async function applyFix(sb: any, body: AnyBody, userId: string) {
  if (!body.url_path || !body.payload) throw new Error("url_path & payload required");
  const path = normalizePath(body.url_path);
  const variant = body.variant || "A";

  // Load current override (if any)
  const { data: current } = await sb
    .from("seo_overrides")
    .select("*")
    .eq("url_path", path)
    .maybeSingle();

  // Snapshot current to history before overwriting (only if there is an existing override)
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
      source_audit_id: current.source_audit_id,
      score_before: null,
      score_after: null,
      change_type: "snapshot_before_apply",
      applied_by: userId,
      notes: body.notes || null,
    });
  }

  const p = body.payload as any;

  if (variant === "B") {
    // Apply as variant B (do not touch the live A version)
    const variantB = {
      title: p.title ?? current?.title ?? null,
      meta_description: p.meta_description ?? current?.meta_description ?? null,
      json_ld: p.json_ld ?? current?.json_ld ?? null,
      extra_keywords: p.extra_keywords ?? current?.extra_keywords ?? [],
    };
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
      // Need an A first — promote payload to A and B equal
      await sb.from("seo_overrides").insert({
        url_path: path,
        title: variantB.title,
        meta_description: variantB.meta_description,
        json_ld: variantB.json_ld,
        extra_keywords: variantB.extra_keywords,
        ab_variant_b: variantB,
        ab_enabled: body.ab_enabled ?? true,
        applied_by: userId,
      });
    }
    return { ok: true, variant: "B", version: nextVersion };
  }

  // Apply as variant A (live)
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
      source_audit_id: body.audit_id ?? null,
      applied_by: userId,
    });
  }
  return { ok: true, variant: "A", version: nextVersion };
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

  // Snapshot current before reverting
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
  // Get latest audit per URL with score < threshold
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
    // Small delay to avoid rate limits
    await new Promise((r) => setTimeout(r, 600));
  }
  return { ok: true, processed: results.length, results };
}

// ============================================================================
// toggle_ab
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

// ============================================================================
// check_regression
// ============================================================================

async function checkRegression(sb: any, body: AnyBody, userId: string) {
  const delta = body.regression_delta ?? 5;
  // Compare last applied score (from history) with newest audit score
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
    const fullUrl = `https://www.realtrust.ro${ov.url_path}`;
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
      // Find previous history version & revert
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
  return { ok: true, reverts };
}

// ============================================================================
// list_history
// ============================================================================

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
