// Force-fetch a prospect's phone number using a 2-step "hydration" strategy:
//   1. Render the source page with Firecrawl using `proxy: "stealth"` (residential
//      proxy pool) + rotating User-Agent (desktop ↔ mobile) + per-platform click
//      actions on the "Show phone" CTA.
//   2. Retry up to 3 times with a clean proxy / different UA if no phone is found
//      (mitigates rate-limits & IP blocks on contact endpoints of OLX/Storia/Publi24).
//
// Updates prospect_listings.phone_normalized + contact_phone when found and writes
// a detailed audit note. Returns { success, found, phone, attempts, source }.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/adminAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PHONE_PATTERN = /(?:\+?40|0040|0)?\s*[237](?:[\s().-]*\d){8}\b/g;

const USER_AGENTS = [
  // Desktop Chrome (Windows)
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  // Mobile Safari (iPhone)
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  // Mobile Chrome (Android)
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
];

function normalizeRoPhone(raw?: string | null): string | null {
  if (!raw) return null;
  if (raw.includes("...") || raw.includes("***") || raw.includes("•")) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0040")) digits = digits.slice(2);
  if (digits.startsWith("40") && digits.length === 11) return /^40[237]\d{8}$/.test(digits) ? `+${digits}` : null;
  if (digits.startsWith("0") && digits.length === 10) return /^0[237]\d{8}$/.test(digits) ? `+4${digits}` : null;
  if (/^[237]\d{8}$/.test(digits)) return `+40${digits}`;
  return null;
}

function extractPhones(text: string): string[] {
  const out = new Set<string>();
  const matches = text.match(PHONE_PATTERN) ?? [];
  for (const m of matches) {
    const n = normalizeRoPhone(m);
    if (n) out.add(n);
  }
  return [...out];
}

function buildActionsForUrl(url: string) {
  const u = url.toLowerCase();
  const actions: any[] = [{ type: "wait", milliseconds: 2200 }];

  // Cookie banner dismissals (works on OLX/Storia/Publi24)
  actions.push({ type: "click", selector: "#onetrust-accept-btn-handler" });
  actions.push({ type: "click", selector: 'button[data-testid="cookie-policy-banner-accept"]' });
  actions.push({ type: "click", selector: 'button[id*="cookie" i][id*="accept" i]' });
  actions.push({ type: "wait", milliseconds: 700 });

  // Scroll to contact section to trigger lazy-load
  actions.push({ type: "scroll", direction: "down", amount: 800 });
  actions.push({ type: "wait", milliseconds: 500 });

  if (u.includes("olx.ro")) {
    actions.push({ type: "click", selector: 'button[data-testid="show-phone"]' });
    actions.push({ type: "click", selector: 'button[data-cy="show-phone"]' });
    actions.push({ type: "click", selector: 'a[data-testid="contact-phone"]' });
    actions.push({ type: "click", selector: 'button[aria-label*="telefon" i]' });
  } else if (u.includes("storia.ro") || u.includes("imobiliare.ro")) {
    actions.push({ type: "click", selector: 'button[data-cy="phoneButton"]' });
    actions.push({ type: "click", selector: 'button[data-cy="show-phone-number"]' });
    actions.push({ type: "click", selector: 'button[data-testid="reveal-phone-button"]' });
    actions.push({ type: "click", selector: 'button[aria-label*="telefon" i]' });
    actions.push({ type: "click", selector: 'button:has-text("Afișează")' });
    actions.push({ type: "click", selector: 'button:has-text("Afiseaza")' });
  } else if (u.includes("publi24.ro") || u.includes("anuntul.ro")) {
    actions.push({ type: "click", selector: 'button:has-text("Telefon")' });
    actions.push({ type: "click", selector: 'a.phone-link' });
    actions.push({ type: "click", selector: 'button[class*="phone" i]' });
  } else {
    actions.push({ type: "click", selector: 'button:has-text("telefon")' });
    actions.push({ type: "click", selector: 'button:has-text("phone")' });
    actions.push({ type: "click", selector: 'a[href^="tel:"]' });
  }

  actions.push({ type: "wait", milliseconds: 2000 });
  // Final scroll & wait for any animated reveal
  actions.push({ type: "scroll", direction: "down", amount: 200 });
  actions.push({ type: "wait", milliseconds: 600 });
  return actions;
}

async function firecrawlScrape(url: string, apiKey: string, userAgent: string) {
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      formats: ["markdown", "html"],
      onlyMainContent: false,
      waitFor: 3500,
      timeout: 45000,
      maxAge: 0, // always re-fetch — bypass Firecrawl cache for fresh proxy IP
      proxy: "stealth", // residential proxy pool — avoids IP blocks on contact endpoints
      actions: buildActionsForUrl(url),
      location: { country: "RO", languages: ["ro"] },
      headers: {
        "User-Agent": userAgent,
        "Accept-Language": "ro-RO,ro;q=0.9,en;q=0.5",
      },
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Firecrawl ${res.status}`);
  const doc = data?.data ?? data;
  return {
    markdown: doc?.markdown ?? "",
    html: doc?.html ?? "",
  };
}

async function tryExtract(url: string, apiKey: string, attempt: number): Promise<{ phones: string[]; ua: string }> {
  const ua = USER_AGENTS[attempt % USER_AGENTS.length];
  const { markdown, html } = await firecrawlScrape(url, apiKey, ua);
  const telLinks = (html.match(/tel:[^"'<>\s]+/gi) ?? []).join(" ");
  const jsonPhones = (html.match(/"(?:phone|telephone|phoneNumber|contactPhone)"\s*:\s*"([^"]+)"/gi) ?? []).join(" ");
  const corpus = `${telLinks}\n${jsonPhones}\n${markdown}\n${html}`;
  return { phones: extractPhones(corpus), ua };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAdmin(req, corsHeaders);
  if (!auth.ok) return auth.response!;

  try {
    const { prospect_id, max_attempts } = await req.json().catch(() => ({}));
    if (!prospect_id || typeof prospect_id !== "string") {
      return new Response(JSON.stringify({ success: false, error: "prospect_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: "FIRECRAWL_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: prospect, error: fErr } = await supabase
      .from("prospect_listings")
      .select("id, source_url, source_platform, contact_phone, phone_normalized, admin_notes")
      .eq("id", prospect_id)
      .single();
    if (fErr || !prospect) {
      return new Response(JSON.stringify({ success: false, error: "Prospect not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!prospect.source_url) {
      return new Response(JSON.stringify({ success: false, error: "No source_url on prospect" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Hard cap: max 5 force-fetch attempts per prospect (protects residential proxy pool) ──
    const MAX_FORCE_FETCH_RUNS = 5;
    const priorRuns = ((prospect.admin_notes ?? "").match(/\[fetch-phone /g) ?? []).length;
    if (priorRuns >= MAX_FORCE_FETCH_RUNS) {
      await supabase.from("admin_audit_log" as any).insert({
        action: "prospect_phone_force_fetch_limit_reached",
        entity_type: "prospect_listing",
        entity_id: prospect.id,
        metadata: { prior_runs: priorRuns, limit: MAX_FORCE_FETCH_RUNS, source_url: prospect.source_url },
      } as any);
      return new Response(
        JSON.stringify({
          success: false,
          limit_reached: true,
          prior_runs: priorRuns,
          limit: MAX_FORCE_FETCH_RUNS,
          error: `Limită atinsă: ${priorRuns}/${MAX_FORCE_FETCH_RUNS} încercări de forțare deja efectuate pentru acest anunț.`,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const maxAttempts = Math.min(Math.max(parseInt(String(max_attempts ?? 3)) || 3, 1), 4);
    console.log(`[fetch-phone] ${prospect.id} <- ${prospect.source_url} (max ${maxAttempts}, run ${priorRuns + 1}/${MAX_FORCE_FETCH_RUNS})`);

    let lastErr: string | null = null;
    let allPhones: string[] = [];
    let usedUa = "";
    let attemptsRan = 0;

    for (let i = 0; i < maxAttempts; i++) {
      attemptsRan = i + 1;
      try {
        const { phones, ua } = await tryExtract(prospect.source_url, apiKey, i);
        usedUa = ua;
        if (phones.length > 0) {
          allPhones = phones;
          break;
        }
        // exponential backoff between attempts to let proxy rotate
        if (i < maxAttempts - 1) {
          await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
        }
      } catch (e: any) {
        lastErr = e?.message || String(e);
        console.warn(`[fetch-phone] attempt ${i + 1} failed: ${lastErr}`);
        if (i < maxAttempts - 1) {
          await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
        }
      }
    }

    const phone = allPhones[0] ?? null;
    const stamp = new Date().toISOString().slice(0, 16);

    if (!phone) {
      const note = `[fetch-phone ${stamp}] ${attemptsRan} încercări (proxy stealth + UA rotation) — nimic găsit${lastErr ? ` · ultima eroare: ${lastErr}` : ""}`;
      await supabase
        .from("prospect_listings")
        .update({ admin_notes: [prospect.admin_notes, note].filter(Boolean).join("\n") })
        .eq("id", prospect.id);
      await supabase.from("admin_audit_log" as any).insert({
        action: "prospect_phone_force_fetch_failed",
        entity_type: "prospect_listing",
        entity_id: prospect.id,
        metadata: { attempts: attemptsRan, last_error: lastErr, ua: usedUa, source_url: prospect.source_url },
      } as any);
      return new Response(
        JSON.stringify({ success: true, found: false, attempts: attemptsRan, phones: [], lastError: lastErr }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const note = `[fetch-phone ${stamp}] recuperat: ${phone}${allPhones.length > 1 ? ` (+${allPhones.length - 1} alt.)` : ""} · ${attemptsRan} încercări · proxy stealth`;
    const { error: uErr } = await supabase
      .from("prospect_listings")
      .update({
        contact_phone: prospect.contact_phone || phone,
        phone_normalized: phone,
        admin_notes: [prospect.admin_notes, note].filter(Boolean).join("\n"),
      })
      .eq("id", prospect.id);
    if (uErr) throw uErr;

    await supabase.from("admin_audit_log" as any).insert({
      action: "prospect_phone_force_fetched",
      entity_type: "prospect_listing",
      entity_id: prospect.id,
      metadata: { phone, alternates: allPhones.slice(1), attempts: attemptsRan, ua: usedUa },
    } as any);

    return new Response(
      JSON.stringify({
        success: true,
        found: true,
        phone,
        alternates: allPhones.slice(1),
        attempts: attemptsRan,
        source: "stealth_proxy",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("[fetch-phone] error:", e);
    return new Response(JSON.stringify({ success: false, error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
