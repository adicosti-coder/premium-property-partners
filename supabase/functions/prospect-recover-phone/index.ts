// Recovers hidden phone numbers from prospect_listings.source_url by scraping the
// original page with Firecrawl using click actions on the "show phone" CTA.
// Updates prospect_listings.phone_normalized + contact_phone when a phone is found.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/adminAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PHONE_PATTERN = /(?:\+?40|0040|0)?\s*[237](?:[\s().-]*\d){8}\b/g;

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

/** Platform-specific click selectors for the "show phone" reveal CTA. */
function buildActionsForUrl(url: string) {
  const u = url.toLowerCase();
  const actions: any[] = [{ type: "wait", milliseconds: 2500 }];

  // Best-effort cookie banner dismissal (works on OLX and many RO sites)
  actions.push({ type: "click", selector: "#onetrust-accept-btn-handler" });
  actions.push({ type: "click", selector: 'button[data-testid="cookie-policy-banner-accept"]' });
  actions.push({ type: "wait", milliseconds: 800 });

  if (u.includes("olx.ro")) {
    actions.push({ type: "click", selector: 'button[data-testid="show-phone"]' });
    actions.push({ type: "click", selector: 'button[data-cy="show-phone"]' });
    actions.push({ type: "click", selector: 'a[data-testid="contact-phone"]' });
  } else if (u.includes("storia.ro") || u.includes("imobiliare.ro")) {
    actions.push({ type: "click", selector: 'button[data-cy="phoneButton"]' });
    actions.push({ type: "click", selector: 'button[data-cy="show-phone-number"]' });
    actions.push({ type: "click", selector: 'button[aria-label*="telefon" i]' });
    actions.push({ type: "click", selector: 'button:has-text("telefon")' });
    actions.push({ type: "click", selector: 'button:has-text("Afiseaza")' });
  } else if (u.includes("publi24.ro") || u.includes("anuntul.ro")) {
    actions.push({ type: "click", selector: 'button:has-text("Telefon")' });
    actions.push({ type: "click", selector: 'a.phone-link' });
  } else {
    // Generic fallback
    actions.push({ type: "click", selector: 'button:has-text("telefon")' });
    actions.push({ type: "click", selector: 'button:has-text("phone")' });
  }

  actions.push({ type: "wait", milliseconds: 1800 });
  return actions;
}

async function firecrawlScrape(url: string, apiKey: string) {
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      formats: ["markdown", "html"],
      onlyMainContent: false,
      waitFor: 3500,
      actions: buildActionsForUrl(url),
      location: { country: "RO", languages: ["ro"] },
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Firecrawl ${res.status}`);
  // v2 may wrap in data
  const doc = data?.data ?? data;
  return {
    markdown: doc?.markdown ?? "",
    html: doc?.html ?? "",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAdmin(req, corsHeaders);
  if (!auth.ok) return auth.response!;

  try {
    const { prospect_id } = await req.json();
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
      .select("id, source_url, contact_phone, phone_normalized, admin_notes")
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

    console.log(`[recover-phone] ${prospect.id} <- ${prospect.source_url}`);
    const { markdown, html } = await firecrawlScrape(prospect.source_url, apiKey);

    // Phone often lands in a tel: link inside html — search both bodies.
    const telLinks = (html.match(/tel:[^"'<>\s]+/gi) ?? []).join(" ");
    const corpus = `${telLinks}\n${markdown}\n${html}`;
    const phones = extractPhones(corpus);
    const phone = phones[0] ?? null;

    if (!phone) {
      const note = `[recover-phone ${new Date().toISOString().slice(0, 16)}] niciun telefon găsit după click pe „Arată numărul"`;
      await supabase
        .from("prospect_listings")
        .update({ admin_notes: [prospect.admin_notes, note].filter(Boolean).join("\n") })
        .eq("id", prospect.id);
      return new Response(JSON.stringify({ success: true, found: false, phones: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const note = `[recover-phone ${new Date().toISOString().slice(0, 16)}] recuperat: ${phone}${phones.length > 1 ? ` (+${phones.length - 1} alt.)` : ""}`;
    const { error: uErr } = await supabase
      .from("prospect_listings")
      .update({
        contact_phone: prospect.contact_phone || phone,
        phone_normalized: phone,
        admin_notes: [prospect.admin_notes, note].filter(Boolean).join("\n"),
      })
      .eq("id", prospect.id);
    if (uErr) throw uErr;

    return new Response(JSON.stringify({ success: true, found: true, phone, alternates: phones.slice(1) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[recover-phone] error:", e);
    return new Response(JSON.stringify({ success: false, error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
