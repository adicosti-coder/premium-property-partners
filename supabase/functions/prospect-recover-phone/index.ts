// Recovers hidden phone numbers from prospect_listings.source_url by scraping the
// original page with Firecrawl using click actions on the "show phone" CTA.
// Updates prospect_listings.phone_normalized + contact_phone when a phone is found.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/adminAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PHONE_PATTERN = /(?:(?:\+|00)\s*40|0)\s*[237](?:[\s().\/-]*\d){8}\b/g;
const CONTEXT_PHONE_PATTERN = /(?:telefon|tel\.?|mobil|mobile|whatsapp|contact|num[ăa]r|phone)\D{0,24}((?:(?:\+|00)\s*40|0)?\s*[237](?:[\s().\/-]*\d){8})/gi;
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

function normalizeRoPhone(raw?: string | null): string | null {
  if (!raw) return null;
  if (/[xX*•]{2,}|\.{3,}/.test(raw)) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0040")) digits = digits.slice(2);
  if (digits.startsWith("40") && digits.length === 11) return /^40[237]\d{8}$/.test(digits) ? `+${digits}` : null;
  if (digits.startsWith("0") && digits.length === 10) return /^0[237]\d{8}$/.test(digits) ? `+4${digits}` : null;
  if (/^[237]\d{8}$/.test(digits)) return `+40${digits}`;
  return null;
}

function decodePhoneText(text: string): string {
  return text
    .replace(/%2B/gi, "+")
    .replace(/%([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\u00([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&nbsp;|&thinsp;|&ensp;|&emsp;/gi, " ");
}

function extractPhones(text: string): string[] {
  const out = new Set<string>();
  const decoded = decodePhoneText(text);
  for (const m of decoded.match(PHONE_PATTERN) ?? []) {
    const n = normalizeRoPhone(m);
    if (n) out.add(n);
  }
  for (const match of decoded.matchAll(CONTEXT_PHONE_PATTERN)) {
    const m = match[1];
    const n = normalizeRoPhone(m);
    if (n) out.add(n);
  }
  return [...out].sort((a, b) => Number(!a.startsWith("+407")) - Number(!b.startsWith("+407")));
}

/** Platform-specific click selectors for the "show phone" reveal CTA. */
function buildActionsForUrl(url: string) {
  const u = url.toLowerCase();
  let phoneSelectors: string[];

  if (u.includes("olx.ro")) {
    phoneSelectors = [
      'button[data-testid="show-phone"]', 'button[data-cy="show-phone"]', 'a[data-testid="contact-phone"]',
      'button[data-testid*="phone" i]', 'button[data-cy*="phone" i]', 'a[href^="tel:"]',
      'button[aria-label*="telefon" i]', 'button[aria-label*="phone" i]',
    ];
  } else if (u.includes("storia.ro") || u.includes("imobiliare.ro")) {
    phoneSelectors = [
      'button[data-cy="phoneButton"]', 'button[data-cy="show-phone-number"]', 'button[data-testid="reveal-phone-button"]',
      'button[aria-label*="telefon" i]', 'button[data-cy*="phone" i]', 'button[data-testid*="phone" i]', 'a[href^="tel:"]',
    ];
  } else if (u.includes("publi24.ro") || u.includes("anuntul.ro")) {
    phoneSelectors = ['a.phone-link', 'button[class*="phone" i]', 'button[id*="phone" i]', 'a[href^="tel:"]'];
  } else {
    phoneSelectors = [
      'button[aria-label*="telefon" i]', 'button[aria-label*="phone" i]', 'a[href^="tel:"]',
      'button[class*="phone" i]', 'button[id*="phone" i]', 'button[data-testid*="phone" i]', 'button[data-cy*="phone" i]',
    ];
  }

  const js = `
    try {
      var safeClick = function (sel) { try { document.querySelectorAll(sel).forEach(function (el) { try { el.click(); } catch (e) {} }); } catch (e) {} };
      ['#onetrust-accept-btn-handler','button[data-testid="cookie-policy-banner-accept"]','button[id*="cookie" i][id*="accept" i]','button[class*="cookie" i][class*="accept" i]','button[aria-label*="accept" i]','button[aria-label*="acceptă" i]'].forEach(safeClick);
      try { window.scrollTo(0, Math.max(500, Math.floor(document.body.scrollHeight * 0.35))); } catch (e) {}
      ${JSON.stringify(phoneSelectors)}.forEach(safeClick);
      try {
        var re = /(afi[șs]eaz[ăa]|arat[ăa]|vezi|apeleaz[ăa]|sun[ăa]|show|reveal|contact)\\b[\\s\\S]{0,44}?(telefon|num[ăa]r|phone|number|mobile|contact)|^(telefon|tel\\.?|phone)$/i;
        document.querySelectorAll('button, a, [role="button"], [onclick], div, span').forEach(function (el) {
          try { var txt = ((el.getAttribute('aria-label') || '') + ' ' + (el.getAttribute('title') || '') + ' ' + (el.textContent || '')).trim(); if (re.test(txt)) el.click(); } catch (e) {}
        });
      } catch (e) {}
    } catch (e) {}
  `;

  return [
    { type: "wait", milliseconds: 2200 },
    { type: "executeJavascript", script: js },
    { type: "wait", milliseconds: 2200 },
    { type: "scroll", direction: "down", amount: 500 },
    { type: "executeJavascript", script: js },
    { type: "wait", milliseconds: 1500 },
  ];
}

async function firecrawlScrape(url: string, apiKey: string) {
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      formats: ["markdown", "html", "rawHtml"],
      onlyMainContent: false,
      waitFor: 3500,
      timeout: 45000,
      maxAge: 0,
      proxy: "stealth",
      actions: buildActionsForUrl(url),
      location: { country: "RO", languages: ["ro"] },
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "ro-RO,ro;q=0.9,en;q=0.5",
      },
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Firecrawl ${res.status}`);
  // v2 may wrap in data
  const doc = data?.data ?? data;
  return {
    markdown: doc?.markdown ?? "",
    html: doc?.html ?? "",
    rawHtml: doc?.rawHtml ?? doc?.raw_html ?? "",
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
    const { markdown, html, rawHtml } = await firecrawlScrape(prospect.source_url, apiKey);

    // Phone often lands in a tel: link inside html — search both bodies.
    const htmlBlob = `${html}\n${rawHtml}`;
    const telLinks = (htmlBlob.match(/(?:tel:|callto:|whatsapp:\/\/send\?phone=)[^"'<>\s]+/gi) ?? []).join(" ");
    const jsonPhones = (htmlBlob.match(/"(?:phone|telephone|phoneNumber|contactPhone|mobile|sellerPhone)"\s*:\s*"([^"]+)"/gi) ?? []).join(" ");
    const corpus = `${telLinks}\n${jsonPhones}\n${markdown}\n${html}\n${rawHtml}`;
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
