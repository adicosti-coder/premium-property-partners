// Enriches a scraped prospect listing: AI copywriting (title + structured description)
// + image optimization (resize, light enhance, RealTrust watermark) + SEO ALT tags.
// Stores results in prospect_listings.{enriched_title, enriched_description, enriched_images, enrichment_status}.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image, decode } from "https://deno.land/x/imagescript@1.2.17/mod.ts";
import { requireAdmin } from "../_shared/adminAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

const BUCKET = "property-images";
const MAX_IMAGES = 6;
const FONT_URL =
  "https://github.com/google/fonts/raw/main/apache/roboto/static/Roboto-Bold.ttf";
const DEWATERMARK_URL =
  "https://platform.dewatermark.ai/api/object_removal/v2/erase_watermark";

// ---------- Text sanitizer: strip owner/anti-agency phrases ----------
// Order matters: longer multi-word phrases first.
const BANNED_PATTERNS: RegExp[] = [
  /nu\s+(?:vreau|doresc)\s+(?:s[ăa]\s+fie\s+preluat\s+anun[țt]ul|sa\s+fie\s+preluat)[^.\n!?]*/giu,
  /nu\s+(?:vreau|doresc|accept[aă]?m?)\s+(?:colaborare|colabor[ăa]ri|agen[țt]ii?|intermediari)[^.\n!?]*/giu,
  /f[ăa]r[ăa]\s+(?:agen[țt]ii?|intermediari|comision|comisioane)[^.\n!?]*/giu,
  /(?:rog|v[ăa]\s+rog)\s+(?:far[ăa]|fara)\s+(?:agen[țt]ii?|intermediari)[^.\n!?]*/giu,
  /(?:nu\s+sun(?:a[țt]i)?|nu\s+contacta[țt]i)\s+(?:agen[țt]ii?|intermediari)[^.\n!?]*/giu,
  /(?:doar|numai)\s+(?:persoane\s+fizice|cump[ăa]r[ăa]tori\s+direc[țt]i)[^.\n!?]*/giu,
  /(?:strict\s+)?(?:de\s+la\s+)?proprietar(?:i|ul|ului)?(?:\s+direct)?/giu,
  /persoan[ăa]\s+fizic[ăa]/giu,
  /persoane\s+fizice/giu,
  /comision\s*0\s*%?/giu,
  /comision\s+zero/giu,
  /zero\s+comision/giu,
  /f[ăa]r[ăa]\s+comision/giu,
  /no\s+commission/gi,
  /owner\s+only/gi,
  /no\s+agents?/gi,
];

function sanitizeListingText(input: string | null | undefined): string {
  if (!input) return "";
  let s = String(input);
  for (const re of BANNED_PATTERNS) s = s.replace(re, " ");
  // Collapse leftovers: double spaces, orphan punctuation, repeated newlines
  s = s
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/([.,;:!?]){2,}/g, "$1")
    .replace(/(?:^|\n)[\s\-•·]*[.,;:!?]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return s;
}

let cachedFont: Uint8Array | null = null;
async function getFont(): Promise<Uint8Array | null> {
  if (cachedFont) return cachedFont;
  try {
    const r = await fetch(FONT_URL);
    if (!r.ok) return null;
    cachedFont = new Uint8Array(await r.arrayBuffer());
    return cachedFont;
  } catch (e) {
    console.warn("font fetch failed", e);
    return null;
  }
}

interface ProspectRow {
  id: string;
  title: string | null;
  description: string | null;
  zone: string | null;
  location: string | null;
  rooms: number | null;
  size: number | null;
  price: number | null;
  features: string[] | null;
  images: string[] | null;
  category: string | null;
}

interface EnrichedImage {
  original: string;
  optimized: string;
  alt: string;
}

function roomsLabel(r: number | null | undefined): string {
  if (!r) return "Apartament";
  if (r === 1) return "Garsonieră";
  return `Apartament ${r} camere`;
}

function buildAlt(p: ProspectRow, idx: number): string {
  const room = roomsLabel(p.rooms);
  const zone = p.zone || p.location || "Timișoara";
  const tags = ["Living luminos", "Bucătărie modernă", "Dormitor", "Baie", "Hol", "Balcon"];
  const tag = tags[idx] || `Imagine ${idx + 1}`;
  return `${tag} - ${room} ${zone}, Timișoara - RealTrust`.slice(0, 125);
}

async function rewriteWithAI(p: ProspectRow): Promise<{ title: string; description: string } | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    console.warn("LOVABLE_API_KEY missing — skip text rewrite");
    return null;
  }

  const cleanTitle = sanitizeListingText(p.title);
  const cleanDesc = sanitizeListingText(p.description);

  const prompt = `Rescrie acest anunț imobiliar într-un stil premium pentru realtrust.ro (agenție imobiliară).

DATE BRUTE (deja curățate de mențiuni de proprietar):
- Titlu original: ${cleanTitle || "(lipsește)"}
- Descriere originală: ${cleanDesc || "(lipsește)"}
- Zonă: ${p.zone || p.location || "Timișoara"}
- Camere: ${p.rooms ?? "n/a"}, Suprafață: ${p.size ?? "n/a"} mp, Preț: ${p.price ?? "n/a"} EUR
- Dotări detectate: ${(p.features || []).join(", ") || "n/a"}
- Categorie: ${p.category || "vanzare"}

CERINȚE STRICTE:
1. Titlu SEO max 70 caractere, format: "Apartament [Camere] [Stil] – Zona [Cartier], Timișoara"
2. Descriere structurată cu bullet points markdown, secțiuni: **📍 Localizare**, **✨ Finisaje & Dotări**, **💼 Potențial investițional** (mențiune regim hotelier / chirie lungă cu cifre realiste 9.4% ROI pentru Timișoara).
3. Limba română cu diacritice. Curăță greșelile gramaticale. Fără superlative goale.
4. INTERZIS să incluzi (anunțul apare pe site de agenție): "proprietar", "proprietari", "persoană fizică", "persoane fizice", "fără comision", "comision 0%", "comision zero", "fără agenții", "fără intermediari", "nu doresc colaborare", "nu vreau agenții", "doar persoane fizice", "owner", "no agents", "no commission" sau orice variantă similară. Nu menționa cine este vânzătorul; descrie doar proprietatea.
5. Returnează STRICT JSON: {"title":"...","description":"..."} — fără backticks, fără text adițional.`;

  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "Ești copywriter imobiliar premium pentru RealTrust Timișoara (AGENȚIE). Nu menționezi niciodată proprietar, persoană fizică, comision sau agenții. Returnezi DOAR JSON valid." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!r.ok) {
    const t = await r.text().catch(() => "");
    console.error("AI rewrite failed", r.status, t.slice(0, 300));
    return null;
  }
  const data = await r.json();
  const raw = data.choices?.[0]?.message?.content || "";
  const jsonStr = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed.title && parsed.description) {
      // Defense-in-depth: sanitize AI output too, in case it slipped any banned terms.
      const title = sanitizeListingText(String(parsed.title)).slice(0, 150);
      const description = sanitizeListingText(String(parsed.description));
      return { title, description };
    }
  } catch (e) {
    console.error("AI rewrite JSON parse fail", e, raw.slice(0, 200));
  }
  return null;
}

// Try removing source watermarks via Dewatermark.ai. Returns cleaned bytes or null on failure.
async function removeSourceWatermark(bytes: Uint8Array): Promise<Uint8Array | null> {
  const apiKey = Deno.env.get("DEWATERMARK_API_KEY");
  if (!apiKey) return null;
  try {
    const form = new FormData();
    form.append("original_preview_image", new Blob([bytes], { type: "image/jpeg" }), "image.jpg");
    form.append("remove_text", "true");
    form.append("predict_mode", "3.0");
    const resp = await fetch(DEWATERMARK_URL, {
      method: "POST",
      headers: { "X-API-KEY": apiKey },
      body: form,
      signal: AbortSignal.timeout(30000),
    });
    if (!resp.ok) {
      console.warn("dewatermark non-ok", resp.status);
      return null;
    }
    const data = await resp.json();
    const b64: string | undefined = data?.edited_image?.image;
    if (!b64) return null;
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch (e) {
    console.warn("dewatermark err", (e as Error).message);
    return null;
  }
}

async function processImage(
  url: string,
  font: Uint8Array | null,
): Promise<Uint8Array | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) return null;
    const ct = r.headers.get("content-type") || "";
    if (!ct.startsWith("image/")) return null;
    const buf = new Uint8Array(await r.arrayBuffer());
    if (buf.byteLength > 12 * 1024 * 1024) return null; // 12MB cap
    const decoded = await decode(buf);
    if (!(decoded instanceof Image)) return null;
    const img = decoded as Image;

    // Resize down (preserve aspect) if very large
    if (img.width > 1600) {
      const newH = Math.round((1600 / img.width) * img.height);
      img.resize(1600, newH);
    }
    // Light auto-enhance
    try { img.contrast(1.08); img.saturation(1.05); } catch (_) { /* ignore */ }

    // Watermark
    if (font) {
      try {
        const label = Image.renderText(font, 30, "REALTRUST", 0xffffffe6);
        const padX = 18;
        const padY = 18;
        // Semi-transparent dark plate
        const plateW = label.width + 24;
        const plateH = label.height + 16;
        const plate = new Image(plateW, plateH).fill(0x000000aa);
        const px = img.width - plateW - padX;
        const py = img.height - plateH - padY;
        img.composite(plate, px, py);
        img.composite(label, px + 12, py + 8);
      } catch (e) { console.warn("watermark fail", e); }
    }

    return await img.encodeJPEG(82);
  } catch (e) {
    console.warn("processImage err", url, (e as Error).message);
    return null;
  }
}

async function enrichImages(
  sb: ReturnType<typeof createClient>,
  prospectId: string,
  p: ProspectRow,
): Promise<EnrichedImage[]> {
  const raw = (p.images || []).filter((u) => typeof u === "string" && /^https?:\/\//i.test(u));
  if (raw.length === 0) return [];
  const slice = raw.slice(0, MAX_IMAGES);
  const font = await getFont();
  const out: EnrichedImage[] = [];

  for (let i = 0; i < slice.length; i++) {
    const url = slice[i];
    const processed = await processImage(url, font);
    let optimized = url;
    if (processed) {
      const path = `prospect-enriched/${prospectId}/${i}-${Date.now()}.jpg`;
      const { error: upErr } = await sb.storage.from(BUCKET).upload(path, processed, {
        contentType: "image/jpeg",
        cacheControl: "31536000",
        upsert: true,
      });
      if (upErr) {
        console.warn("upload fail", path, upErr.message);
      } else {
        const pub = sb.storage.from(BUCKET).getPublicUrl(path);
        optimized = pub.data.publicUrl;
      }
    }
    out.push({ original: url, optimized, alt: buildAlt(p, i) });
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAdmin(req, corsHeaders);
  if (!auth.ok) return auth.response!;

  let prospectId: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    prospectId = body?.prospect_id || body?.id || null;
    if (!prospectId) {
      return new Response(JSON.stringify({ error: "prospect_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: row, error: selErr } = await sb
      .from("prospect_listings")
      .select("id,title,description,zone,location,rooms,size,price,features,images,category")
      .eq("id", prospectId)
      .maybeSingle();

    if (selErr || !row) {
      return new Response(JSON.stringify({ error: "prospect not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await sb.from("prospect_listings")
      .update({ enrichment_status: "processing", enrichment_error: null })
      .eq("id", prospectId);

    const p = row as unknown as ProspectRow;
    const [rewrite, images] = await Promise.all([
      rewriteWithAI(p),
      enrichImages(sb, prospectId, p),
    ]);

    const update: Record<string, unknown> = {
      enriched_title: rewrite?.title ?? p.title,
      enriched_description: rewrite?.description ?? p.description,
      enriched_images: images,
      enrichment_status: "done",
      enriched_at: new Date().toISOString(),
      enrichment_error: rewrite ? null : "ai_rewrite_skipped",
    };

    const { error: updErr } = await sb.from("prospect_listings").update(update).eq("id", prospectId);
    if (updErr) throw new Error(updErr.message);

    return new Response(JSON.stringify({
      ok: true,
      prospect_id: prospectId,
      images_processed: images.length,
      rewritten: !!rewrite,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("enrich-prospect-listing error:", e);
    if (prospectId) {
      try {
        const sb = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        await sb.from("prospect_listings").update({
          enrichment_status: "failed",
          enrichment_error: (e as Error).message?.slice(0, 500) || "unknown",
        }).eq("id", prospectId);
      } catch (_) { /* ignore */ }
    }
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
