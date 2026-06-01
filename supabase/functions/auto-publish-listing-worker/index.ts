/**
 * auto-publish-listing-worker — single-prospect Fan-out worker.
 *
 * Invoked once per prospect by `auto-publish-listings` to isolate the heavy
 * Sanitizer + Gemini AI Rewrite + insert pipeline. Each invocation gets its
 * OWN edge CPU budget, so the parent dispatcher never hits "CPU Time exceeded"
 * even on large batches.
 *
 * Body: { prospect_id: string, triggered_by?: string, use_ai_rewrite?: boolean }
 *
 * Output: 200 JSON { success, published, property_id?, quality?, reason? }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadImportConfig, sanitizeListingText, type ImportConfigRow } from "../_shared/listingSanitizer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MIN_QUALITY = 35;

function slugify(s: string): string {
  return (s || "anunt-importat")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 80) || `import-${Date.now()}`;
}

async function isAuthorized(req: Request): Promise<boolean> {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret && serviceKey && cronSecret === serviceKey) return true;
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (token && serviceKey && token === serviceKey) return true;
  return false;
}

async function firecrawlScrape(url: string, key: string, timeoutMs = 22000): Promise<{ markdown: string; images: string[] } | null> {
  const backoffs = [0, 1000, 3000];
  for (let attempt = 0; attempt < backoffs.length; attempt++) {
    if (backoffs[attempt] > 0) await new Promise((r) => setTimeout(r, backoffs[attempt]));
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url, formats: ["markdown", "html", "links"], waitFor: 2000, onlyMainContent: false, timeout: 18000 }),
        signal: ctl.signal,
      });
      if (!resp.ok) {
        const isClient = resp.status >= 400 && resp.status < 500 && resp.status !== 429;
        if (isClient) return null;
        continue;
      }
      const data = await resp.json();
      const md = data?.data?.markdown || data?.markdown || "";
      const html = data?.data?.html || data?.html || "";
      const meta = data?.data?.metadata || data?.metadata || {};
      const links: string[] = data?.data?.links || [];
      const images = links.filter((l) => /\.(jpe?g|png|webp|avif)(\?|$)/i.test(l));
      const re = /!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g;
      let m;
      const mdImgs: string[] = [];
      while ((m = re.exec(md)) !== null) { if (!mdImgs.includes(m[1])) mdImgs.push(m[1]); }
      const htmlImgs: string[] = [];
      const pushImg = (raw?: string) => {
        if (!raw || raw.startsWith("data:")) return;
        const first = raw.split(",")[0]?.trim().split(/\s+/)[0];
        if (!first) return;
        try { htmlImgs.push(new URL(first, url).toString()); } catch { /* ignore */ }
      };
      for (const rx of [
        /<img[^>]+(?:src|data-src|data-original|data-lazy-src)=["']([^"']+)["']/gi,
        /<source[^>]+srcset=["']([^"']+)["']/gi,
        /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi,
      ]) { while ((m = rx.exec(html)) !== null) pushImg(m[1]); }
      pushImg(meta?.ogImage || meta?.image);
      return { markdown: md, images: Array.from(new Set([...images, ...mdImgs, ...htmlImgs])).slice(0, 25) };
    } catch (_e) {
      // retry
    } finally {
      clearTimeout(to);
    }
  }
  return null;
}

async function rewriteWithAI(
  title: string,
  sanitized: string,
  listingType: string,
  hints: string[],
  compiledPrompt: string | null,
): Promise<{ title?: string; short?: string; full?: string } | null> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key || !sanitized || sanitized.length < 80) return null;
  const hintBlock = hints.length > 0
    ? `\nLECȚII ÎNVĂȚATE DIN CORECȚIILE ADMINULUI:\n- ${hints.slice(0, 12).join("\n- ")}\n`
    : "";
  const systemPrompt = compiledPrompt || `Ești copywriter imobiliar premium pentru RealTrust (agenție din Timișoara).
REGULI STRICTE:
- NU include numere de telefon, emailuri, adrese exacte cu număr stradal.
- NU folosi: "proprietar", "persoană fizică", "fără comision", "comision 0", "direct proprietar".
- Limbaj profesional de agenție, accent pe avantaje și potențial de investiție.`;
  const userPrompt = `Rescrie descrierea pentru un anunț de ${listingType === "inchiriere" ? "închiriere" : "vânzare"}.
Răspunde STRICT în formatul: ---TITLU---\\n[titlu]\\n---SCURT---\\n[descriere scurtă <200 char]\\n---COMPLET---\\n[descriere completă markdown]
${hintBlock}
TITLU ORIGINAL: ${title}
DESCRIERE: ${sanitized.substring(0, 3000)}`;

  const RETRY_DELAYS = [2000, 5000];
  let resp: Response | null = null;
  for (let attempt = 0; attempt < RETRY_DELAYS.length; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt - 1]));
    try {
      const ctl = new AbortController();
      const to = setTimeout(() => ctl.abort(), 25000);
      resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        }),
        signal: ctl.signal,
      });
      clearTimeout(to);
      if (resp.ok) break;
      if (resp.status !== 429 && resp.status < 500) break;
    } catch { /* retry */ }
  }
  if (!resp || !resp.ok) return null;
  const data = await resp.json();
  const text: string = data?.choices?.[0]?.message?.content || "";
  const t = text.match(/---TITLU---\s*([\s\S]*?)\s*---SCURT---/)?.[1]?.trim();
  const s = text.match(/---SCURT---\s*([\s\S]*?)\s*---COMPLET---/)?.[1]?.trim();
  const f = text.match(/---COMPLET---\s*([\s\S]*)$/)?.[1]?.trim();
  return { title: t, short: s, full: f };
}

function computeQualityScore(opts: {
  finalDesc: string; finalTitle: string; imageCount: number;
  hasPrice: boolean; hasZone: boolean; hasRooms: boolean; hasSize: boolean;
  removedPhrasesCount: number; removedPhonesCount: number;
}): number {
  let score = 0;
  if (opts.finalDesc.length >= 800) score += 25;
  else if (opts.finalDesc.length >= 400) score += 18;
  else if (opts.finalDesc.length >= 200) score += 10;
  else score += 2;
  if (opts.finalTitle.length >= 30 && opts.finalTitle.length <= 90) score += 10;
  else if (opts.finalTitle.length >= 15) score += 5;
  if (opts.imageCount >= 6) score += 20;
  else if (opts.imageCount >= 3) score += 12;
  else if (opts.imageCount >= 1) score += 5;
  if (opts.hasPrice) score += 12;
  if (opts.hasZone) score += 8;
  if (opts.hasRooms) score += 6;
  if (opts.hasSize) score += 6;
  score -= Math.min(20, opts.removedPhrasesCount * 4);
  score -= Math.min(10, opts.removedPhonesCount * 3);
  return Math.max(0, Math.min(100, Math.round(score)));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const safeJson = (payload: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    if (!(await isAuthorized(req))) return safeJson({ success: false, error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const prospectId: string | undefined = body?.prospect_id;
    const triggeredBy: string = body?.triggered_by || "fan_out";
    const useAiRewrite: boolean = body?.use_ai_rewrite !== false;
    const idempotencyKey: string | undefined =
      body?.idempotency_key || req.headers.get("x-idempotency-key") || undefined;
    if (!prospectId) return safeJson({ success: false, error: "missing prospect_id" }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");

    // ── Idempotency gate ────────────────────────────────────────────────────
    // 1) Hard guard: a property already exists for this prospect → done.
    const { data: existingProp } = await supabase
      .from("properties")
      .select("id, slug")
      .eq("migrated_from_prospect_id", prospectId)
      .maybeSingle();
    if (existingProp) {
      return safeJson({
        success: true, published: false, reason: "idempotent_skip_existing",
        property_id: existingProp.id, idempotency_key: idempotencyKey,
      });
    }
    // 2) Same idempotency_key already attempted in last 10 min → skip duplicate dispatch.
    if (idempotencyKey) {
      const since = new Date(Date.now() - 10 * 60_000).toISOString();
      const { data: dup } = await supabase
        .from("admin_audit_log")
        .select("id")
        .eq("action", "auto_publish_worker_start")
        .eq("entity_id", prospectId)
        .gte("created_at", since)
        .contains("details", { idempotency_key: idempotencyKey })
        .limit(1)
        .maybeSingle();
      if (dup) {
        return safeJson({ success: true, published: false, reason: "idempotent_skip_inflight", idempotency_key: idempotencyKey });
      }
    }
    // Mark start (best-effort)
    try {
      await supabase.from("admin_audit_log").insert({
        action: "auto_publish_worker_start",
        actor_label: "system",
        entity_type: "prospect_listing",
        entity_id: prospectId,
        details: { idempotency_key: idempotencyKey, triggered_by: triggeredBy },
        severity: "info",
      });
    } catch { /* best-effort */ }

    const { data: prospect, error: pErr } = await supabase
      .from("prospect_listings")
      .select("id, source_url, title, description, location, zone, rooms, size, price, currency, floor, year_built, features, images, category, source_platform, enriched_title, enriched_description, enriched_images, enrichment_status, lead_score, prospect_type")
      .eq("id", prospectId).maybeSingle();
    if (pErr || !prospect) return safeJson({ success: false, error: pErr?.message || "prospect not found" });


    const cat = String(prospect.category || "").toLowerCase().trim();
    if (cat !== "vanzare") {
      await supabase.from("prospect_listings").update({
        tags: ["scrape-prospects", "recrutare-management", cat === "hotelier" ? "regim-hotelier" : "inchiriere-proprietar", "andrei-call-queue", "blocked-from-publish"],
        admin_notes: `NU se publică pe site. Lead Andrei: administrare ${cat === "hotelier" ? "regim hotelier" : "totală/parțială"}.`,
        lifecycle_status: cat === "hotelier" ? "updated_reservation" : "to_call",
      }).eq("id", prospect.id);
      return safeJson({ success: true, published: false, reason: "recruitment_lead", category: cat });
    }

    if (!firecrawlKey) return safeJson({ success: false, error: "FIRECRAWL_API_KEY not configured" });

    const baseConfig = await loadImportConfig(supabase);
    const { data: learnRows } = await supabase
      .from("listing_import_learnings").select("pattern_type, pattern, metadata").eq("is_active", true).limit(300);
    const forbidden: string[] = [];
    const hints: string[] = [];
    for (const r of (learnRows || []) as any[]) {
      if (r.pattern_type === "phrase") forbidden.push(r.pattern);
      else if (r.pattern_type === "title_hint" || r.pattern_type === "description_hint") hints.push(r.pattern);
      else if (r.pattern_type === "semantic_concept") {
        const variants: string[] = Array.isArray(r.metadata?.variants) ? r.metadata.variants : [];
        for (const v of variants) forbidden.push(v);
        if (r.metadata?.description_hint) hints.push(r.metadata.description_hint);
      }
    }
    const mergedConfig: ImportConfigRow[] = [
      ...baseConfig,
      ...forbidden.map((p) => ({ kind: "forbidden_phrase" as const, pattern: p, replacement: "", is_regex: false, enabled: true })),
    ];
    const { data: promptRow } = await supabase
      .from("listing_import_system_prompts").select("compiled_prompt").eq("is_active", true)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    const compiledPrompt = (promptRow as any)?.compiled_prompt || null;

    const hasEnriched = prospect.enrichment_status === "done" &&
      (prospect.enriched_title || prospect.enriched_description) &&
      Array.isArray(prospect.enriched_images);

    let finalTitle: string;
    let finalShort: string;
    let finalFull: string;
    let finalImages: string[];
    let finalImageAlts: string[] = [];
    let rawMd: string;
    let cleanDesc: ReturnType<typeof sanitizeListingText>;
    let cleanTitle: ReturnType<typeof sanitizeListingText>;

    if (hasEnriched) {
      rawMd = prospect.description || prospect.enriched_description || "";
      cleanDesc = sanitizeListingText(prospect.description || "", mergedConfig);
      cleanTitle = sanitizeListingText(prospect.title || "", mergedConfig);
      if (cleanDesc.refusalDetected || cleanTitle.refusalDetected) {
        await supabase.from("prospect_listings").update({
          admin_notes: `[worker] Refuzat: refusal phrase = "${cleanDesc.refusalMatch || cleanTitle.refusalMatch}"`,
          tags: ["scrape-prospects", "auto-import", "no-agency-refusal"],
        }).eq("id", prospect.id);
        return safeJson({ success: true, published: false, reason: "refusal" });
      }
      finalTitle = (prospect.enriched_title || prospect.title || "Anunț Imobiliar Timișoara").substring(0, 200);
      finalFull = prospect.enriched_description || prospect.description || "";
      finalShort = finalFull.replace(/[*_`#>]/g, "").replace(/\n+/g, " ").trim().substring(0, 220);
      const ei = (prospect.enriched_images as Array<{ optimized?: string; original?: string; alt?: string }>) || [];
      finalImages = ei.map((x) => x.optimized || x.original).filter(Boolean) as string[];
      finalImageAlts = ei.map((x) => x.alt || "").filter(Boolean);
      if (finalImages.length === 0 && Array.isArray(prospect.images)) finalImages = prospect.images;
    } else {
      const scrape = await firecrawlScrape(prospect.source_url, firecrawlKey);
      rawMd = scrape?.markdown || prospect.description || "";
      const rawImages = (scrape?.images && scrape.images.length > 0)
        ? scrape.images : (Array.isArray(prospect.images) ? prospect.images : []);
      if (!rawMd || rawMd.length < 60) return safeJson({ success: true, published: false, reason: "no_content" });
      cleanDesc = sanitizeListingText(rawMd, mergedConfig);
      cleanTitle = sanitizeListingText(prospect.title || "Anunț Imobiliar", mergedConfig);
      if (cleanDesc.refusalDetected || cleanTitle.refusalDetected) {
        await supabase.from("prospect_listings").update({
          admin_notes: `[worker] Refuzat: refusal phrase = "${cleanDesc.refusalMatch || cleanTitle.refusalMatch}"`,
          tags: ["scrape-prospects", "auto-import", "no-agency-refusal"],
        }).eq("id", prospect.id);
        return safeJson({ success: true, published: false, reason: "refusal" });
      }
      finalTitle = cleanTitle.sanitized || "Anunț Imobiliar Timișoara";
      finalShort = cleanDesc.sanitized.substring(0, 220);
      finalFull = cleanDesc.sanitized;
      if (useAiRewrite) {
        const ai = await rewriteWithAI(finalTitle, finalFull, prospect.category || "vanzare", hints, compiledPrompt);
        if (ai?.title) finalTitle = sanitizeListingText(ai.title, mergedConfig).sanitized || finalTitle;
        if (ai?.short) finalShort = sanitizeListingText(ai.short, mergedConfig).sanitized || finalShort;
        if (ai?.full)  finalFull  = sanitizeListingText(ai.full,  mergedConfig).sanitized || finalFull;
      }
      finalImages = rawImages;
    }

    finalImages = Array.from(new Set(
      (finalImages || []).filter((u): u is string => typeof u === "string").map((u) => u.trim()).filter((u) => u.length > 0),
    ));

    if (finalImages.length === 0) {
      await supabase.from("prospect_listings").update({
        enrichment_status: "pending",
        admin_notes: `[worker] Respins: 0 imagini (re-scrape programat).`,
        tags: ["scrape-prospects", "auto-import", "no-images-rescrape"],
      }).eq("id", prospect.id);
      return safeJson({ success: true, published: false, reason: "no_images" });
    }

    const quality = computeQualityScore({
      finalDesc: finalFull, finalTitle, imageCount: finalImages.length,
      hasPrice: Boolean(prospect.price), hasZone: Boolean(prospect.zone),
      hasRooms: Boolean(prospect.rooms), hasSize: Boolean(prospect.size),
      removedPhrasesCount: cleanDesc.removed.phrases.length + cleanTitle.removed.phrases.length,
      removedPhonesCount: cleanDesc.removed.phones.length + cleanTitle.removed.phones.length,
    });
    if (quality < MIN_QUALITY) {
      await supabase.from("prospect_listings").update({
        admin_notes: `[worker] Respins calitate < ${MIN_QUALITY} (score=${quality})`,
        tags: ["scrape-prospects", "auto-import", "low-quality"],
      }).eq("id", prospect.id);
      return safeJson({ success: true, published: false, reason: "low_quality", quality });
    }

    const listingType = "vanzare";
    const platform = prospect.source_platform || "unknown";

    const propertyData: Record<string, any> = {
      name: finalTitle.substring(0, 200),
      slug: `${slugify(finalTitle)}-${prospect.id.substring(0, 6)}`,
      location: prospect.zone ? `${prospect.zone}, Timișoara` : (prospect.location || "Timișoara"),
      description_ro: finalShort,
      long_description_ro: finalFull,
      description_en: "",
      long_description_en: "",
      features: Array.isArray(prospect.features) ? prospect.features : [],
      listing_type: listingType,
      tag: "De Vânzare",
      // Fan-out mode: publish ACTIVE directly (admin can still un-publish from review).
      is_active: true,
      needs_review: true,
      quality_score: quality,
      import_source: triggeredBy,
      imported_at: new Date().toISOString(),
      original_source_url: prospect.source_url,
      original_description_raw: rawMd.substring(0, 8000),
      sanitization_log: {
        removed_phones: cleanDesc.removed.phones.length + cleanTitle.removed.phones.length,
        removed_emails: cleanDesc.removed.emails.length + cleanTitle.removed.emails.length,
        removed_addresses: cleanDesc.removed.addresses.length,
        removed_phrases: Array.from(new Set([...cleanDesc.removed.phrases, ...cleanTitle.removed.phrases])),
        ai_rewritten: useAiRewrite,
        used_premium_enrichment: hasEnriched,
        source_platform: platform,
        quality_score: quality,
        fan_out_worker: true,
      },
      migrated_from_prospect_id: prospect.id,
      rooms: prospect.rooms,
      bedrooms: prospect.rooms,
      size: prospect.size,
      capacity: prospect.rooms ? prospect.rooms * 2 : 2,
      bathrooms: 1,
      floor: prospect.floor,
      year_built: prospect.year_built,
      base_price_per_night: null,
      capital_necesar: prospect.price,
      images: finalImages,
      image_alts: finalImageAlts,
      image_path: finalImages[0] || null,
      booking_url: null,
      source_platform: platform,
      source_url: null,
    };

    const { data: inserted, error: insErr } = await supabase
      .from("properties").insert(propertyData).select("id, slug, name").single();
    if (insErr) {
      const dup = (insErr.message || "").toLowerCase().includes("duplicate");
      return safeJson({ success: !dup, published: false, reason: dup ? "duplicate" : "insert_error", error: insErr.message });
    }

    await supabase.from("prospect_listings").update({
      tags: ["scrape-prospects", "auto-import", "site-published"],
      admin_notes: `[worker] Publicat ca proprietate ${inserted.id} (q=${quality}).`,
      lifecycle_status: "to_call",
    }).eq("id", prospect.id);

    // Fire-and-forget: image processing
    if (finalImages.length > 0) {
      const proc = fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/process-listing-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
        body: JSON.stringify({ property_id: inserted.id }),
      }).catch((e) => console.warn("process-listing-images dispatch failed", e?.message));
      // @ts-ignore EdgeRuntime
      if (typeof EdgeRuntime !== "undefined" && (EdgeRuntime as any).waitUntil) EdgeRuntime.waitUntil(proc);
    }

    return safeJson({ success: true, published: true, property_id: inserted.id, slug: inserted.slug, quality });
  } catch (err: any) {
    const message = err?.message || String(err);
    console.error("auto-publish-listing-worker error:", message);
    return safeJson({ success: false, error: message });
  }
});
