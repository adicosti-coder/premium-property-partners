// Public AI analysis for /hostscan-ai: accepts a listing URL or property photos
// and returns a structured evaluation (score, estimated hotel-regime revenue, recommendations).
import { checkRateLimit } from "../_shared/rateLimiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const ALLOWED_HOSTS = [
  "olx.ro",
  "storia.ro",
  "imobiliare.ro",
  "publi24.ro",
  "anuntul.ro",
  "homezz.ro",
  "booking.com",
  "airbnb.com",
  "airbnb.ro",
];

function isAllowedListingUrl(raw: string): { ok: boolean; parsed?: URL } {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false };
  }
  if (parsed.protocol !== "https:") return { ok: false };
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (!ALLOWED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return { ok: false };
  return { ok: true, parsed };
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchListingText(url: string): Promise<string> {
  const scrapeKey = Deno.env.get("SCRAPE_DO_TOKEN") || Deno.env.get("SCRAPEDO_API_KEY");
  if (scrapeKey) {
    try {
      const params = new URLSearchParams({
        token: scrapeKey,
        url,
        render: "true",
        super: "true",
        geoCode: "ro",
        customWait: "3000",
        timeout: "45000",
      });
      const res = await fetch(`https://api.scrape.do/?${params.toString()}`, {
        signal: AbortSignal.timeout(50000),
      });
      if (res.ok) {
        const html = await res.text();
        const text = htmlToText(html);
        if (text.length > 400) return text;
      }
    } catch (e) {
      console.warn("scrape.do failed, falling back to direct fetch", (e as Error).message);
    }
  }

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "accept-language": "ro-RO,ro;q=0.9,en;q=0.8",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`fetch_failed_${res.status}`);
  return htmlToText(await res.text());
}

const SYSTEM_PROMPT = `Ești consultant senior RealTrust Timișoara, specializat în administrare de apartamente în REGIM HOTELIER (short-stay) în Timișoara, județul Timiș.

Reguli de calcul (obligatorii):
- Ocupare medie folosită: 75%.
- Din venitul brut se scade 27% (management + taxe) pentru a obține venitul net.
- Randamentul net standard de referință al portofoliului este ~9,4%/an.
- Zone valide: Cetate/Centru, Iosefin, Fabric, Dumbrăvița, Aradului. Dacă zona nu e clară, scrie "Timișoara".
- Nu inventa date pe care nu le poți susține; când estimezi, marchează clar că este estimare.

Răspunde EXCLUSIV cu JSON valid, în limba română, cu această structură exactă:
{
  "titlu": "titlu scurt al proprietății",
  "zona": "zona identificată",
  "tip_proprietate": "apartament|casa|studio|comercial",
  "camere": 2,
  "suprafata": 55,
  "pret_listare": 95000,
  "moneda": "EUR",
  "scor": 78,
  "max_scor": 100,
  "tarif_noapte": 260,
  "venit_lunar_brut": 5850,
  "venit_lunar_net": 4270,
  "roi_estimat": "8.9%",
  "puncte_forte": ["..."],
  "riscuri": ["..."],
  "recomandari": ["3-5 acțiuni concrete pentru a crește tariful/ocuparea"],
  "comparabile_zona": [
    { "denumire": "apartament 2 camere similar, Cetate", "tarif_noapte": 250, "ocupare_estimata": "72%", "observatie": "1-2 propoziții" }
  ],
  "verdict": "2-4 propoziții, ton profesionist, fără promisiuni exagerate"

}
Valorile numerice sunt în RON pentru tarif/venit și în moneda listării pentru preț. Dacă un câmp nu poate fi determinat, folosește null.`;

function parseJsonLoose(raw: string) {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch { /* ignore */ }
    }
  }
  return null;
}

// ---- Cache (rewrite_cache: property_title = hash, listing_type = 'ai_analysis') ----
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SB_URL = Deno.env.get("SUPABASE_URL") || "";
const SB_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

async function hashInput(parts: string[]): Promise<string> {
  const buf = new TextEncoder().encode(parts.join("|"));
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function cacheGet(hash: string): Promise<Record<string, unknown> | null> {
  if (!SB_URL || !SB_SERVICE_KEY) return null;
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/rewrite_cache?select=rewritten_full,updated_at&listing_type=eq.ai_analysis&property_title=eq.${hash}&limit=1`,
      { headers: { apikey: SB_SERVICE_KEY, Authorization: `Bearer ${SB_SERVICE_KEY}` } },
    );
    if (!res.ok) return null;
    const rows = await res.json();
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row?.rewritten_full) return null;
    if (row.updated_at && Date.now() - new Date(row.updated_at).getTime() > CACHE_TTL_MS) return null;
    return JSON.parse(row.rewritten_full);
  } catch {
    return null;
  }
}

async function cacheSet(hash: string, analysis: unknown, model: string | null) {
  if (!SB_URL || !SB_SERVICE_KEY) return;
  try {
    await fetch(
      `${SB_URL}/rest/v1/rewrite_cache?listing_type=eq.ai_analysis&property_title=eq.${hash}`,
      {
        method: "DELETE",
        headers: { apikey: SB_SERVICE_KEY, Authorization: `Bearer ${SB_SERVICE_KEY}` },
      },
    );
    await fetch(`${SB_URL}/rest/v1/rewrite_cache`, {
      method: "POST",
      headers: {
        apikey: SB_SERVICE_KEY,
        Authorization: `Bearer ${SB_SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        property_title: hash,
        listing_type: "ai_analysis",
        tone: "premium",
        language: "ro",
        rewritten_title: model || "ai",
        rewritten_full: JSON.stringify(analysis),
        updated_at: new Date().toISOString(),
      }),
    });
  } catch (e) {
    console.warn("cache write failed", (e as Error).message);
  }
}

// ---- History (property_analyses): persist every analysis + shareable token ----
async function saveAnalysis(input: {
  hash: string | null;
  mode: string;
  sourceUrl: string | null;
  photoCount: number;
  context: string;
  model: string | null;
  cached: boolean;
  analysis: Record<string, unknown>;
}): Promise<string | null> {
  if (!SB_URL || !SB_SERVICE_KEY) return null;
  const headers = {
    apikey: SB_SERVICE_KEY,
    Authorization: `Bearer ${SB_SERVICE_KEY}`,
    "Content-Type": "application/json",
  };
  try {
    if (input.hash) {
      const existing = await fetch(
        `${SB_URL}/rest/v1/property_analyses?select=share_token&input_hash=eq.${input.hash}&order=created_at.desc&limit=1`,
        { headers },
      );
      if (existing.ok) {
        const rows = await existing.json();
        const token = Array.isArray(rows) ? rows[0]?.share_token : null;
        if (token) return token as string;
      }
    }
    const scoreRaw = (input.analysis as { scor?: unknown }).scor;
    const zoneRaw = (input.analysis as { zona?: unknown }).zona;
    const res = await fetch(`${SB_URL}/rest/v1/property_analyses`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify({
        mode: input.mode,
        source_url: input.sourceUrl,
        photo_count: input.photoCount,
        context_text: input.context || null,
        input_hash: input.hash,
        model: input.model,
        cached: input.cached,
        analysis: input.analysis,
        score: typeof scoreRaw === "number" ? Math.round(scoreRaw) : null,
        zone: typeof zoneRaw === "string" ? zoneRaw.slice(0, 120) : null,
      }),
    });
    if (!res.ok) {
      console.warn("analysis history insert failed", res.status);
      return null;
    }
    const rows = await res.json();
    return (Array.isArray(rows) ? rows[0]?.share_token : null) ?? null;
  } catch (e) {
    console.warn("analysis history failed", (e as Error).message);
    return null;
  }
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const ip =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "unknown";

  const limit = checkRateLimit(`public-listing-analysis:${ip}`, {
    maxRequests: 6,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return json(
      { error: "rate_limited", message: "Prea multe analize. Încearcă din nou într-o oră." },
      429,
    );
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return json({ error: "ai_not_configured" }, 500);

  let payload: { mode?: string; url?: string; images?: unknown; context?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid_body" }, 400);
  }

  const mode = payload.mode === "photos" ? "photos" : "url";
  const context = typeof payload.context === "string" ? payload.context.slice(0, 500) : "";

  let userContent: unknown;
  let sourceUrl: string | null = null;
  let cacheKey: string | null = null;
  let photoCount = 0;

  if (mode === "url") {
    const rawUrl = typeof payload.url === "string" ? payload.url.trim() : "";
    const guard = isAllowedListingUrl(rawUrl);
    if (!guard.ok) {
      return json(
        {
          error: "url_not_allowed",
          message:
            "Acceptăm linkuri de pe OLX, Storia, Imobiliare.ro, Publi24, Anuntul.ro, Homezz, Booking sau Airbnb (https).",
        },
        400,
      );
    }
    sourceUrl = guard.parsed!.toString();

    cacheKey = await hashInput(["url", sourceUrl, context]);
    const cached = await cacheGet(cacheKey);
    if (cached) {
      const token = await saveAnalysis({
        hash: cacheKey,
        mode,
        sourceUrl,
        photoCount: 0,
        context,
        model: null,
        cached: true,
        analysis: cached as Record<string, unknown>,
      });
      return json({ ok: true, mode, source_url: sourceUrl, cached: true, analysis: cached, share_token: token });
    }

    let text: string;
    try {
      text = await fetchListingText(sourceUrl);
    } catch (e) {
      console.error("listing fetch failed", (e as Error).message);
      return json(
        {
          error: "fetch_failed",
          message: "Nu am putut citi anunțul. Încarcă fotografii sau completează manual formularul.",
        },
        502,
      );
    }
    if (text.length < 200) {
      return json(
        { error: "empty_listing", message: "Anunțul pare gol sau protejat. Încearcă cu fotografii." },
        422,
      );
    }

    userContent = `Analizează acest anunț imobiliar din Timișoara (sursă: ${sourceUrl}).${
      context ? ` Context suplimentar de la proprietar: ${context}.` : ""
    }\n\nCONȚINUT PAGINĂ:\n${text.slice(0, 14000)}`;
  } else {
    const images = Array.isArray(payload.images) ? payload.images : [];
    const valid = images
      .filter((i): i is string => typeof i === "string" && i.startsWith("data:image/"))
      .slice(0, 8)
      .filter((i) => i.length < 2_500_000);
    if (valid.length === 0) {
      return json({ error: "no_images", message: "Adaugă minim o fotografie validă." }, 400);
    }
    photoCount = valid.length;
    cacheKey = await hashInput(["photos", context, ...valid]);
    const cachedPhotos = await cacheGet(cacheKey);
    if (cachedPhotos) {
      const tokenPhotos = await saveAnalysis({
        hash: cacheKey,
        mode,
        sourceUrl: null,
        photoCount: valid.length,
        context,
        model: null,
        cached: true,
        analysis: cachedPhotos as Record<string, unknown>,
      });
      return json({ ok: true, mode, source_url: null, cached: true, analysis: cachedPhotos, share_token: tokenPhotos });
    }

    userContent = [
      {
        type: "text",
        text: `Analizează aceste ${valid.length} fotografii ale proprietății din Timișoara și evaluează potențialul în regim hotelier.${
          context ? ` Context de la proprietar: ${context}.` : ""
        }`,
      },
      ...valid.map((url) => ({ type: "image_url", image_url: { url } })),
    ];
  }

  const MODELS = [
    "google/gemini-3.7-flash",
    "google/gemini-2.5-flash",
    "google/gemini-3.1-flash-lite",
    "openai/gpt-5-mini",
  ];

  try {
    let parsed: unknown = null;
    let lastStatus = 0;
    let usedModel: string | null = null;

    for (const model of MODELS) {
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userContent },
          ],
        }),
        signal: AbortSignal.timeout(90000),
      });

      lastStatus = aiRes.status;
      if (!aiRes.ok) {
        console.warn("ai model failed", model, aiRes.status, (await aiRes.text()).slice(0, 300));
        continue;
      }

      const data = await aiRes.json();
      const raw = data.choices?.[0]?.message?.content?.trim() || "";
      const candidate = parseJsonLoose(raw);
      if (candidate) {
        parsed = candidate;
        usedModel = model;
        break;
      }
      console.warn("ai parse failed for model", model);
    }

    if (!parsed) {
      if (lastStatus === 429) {
        return json({ error: "ai_rate_limited", message: "AI-ul este suprasolicitat. Reia analiza în câteva minute." }, 429);
      }
      if (lastStatus === 402) {
        return json({ error: "ai_credits", message: "Analiza AI este momentan indisponibilă. Trimite formularul și îți răspundem în 24h." }, 402);
      }
      return json({ error: "ai_error", message: "Nu am putut genera analiza. Trimite formularul și revenim în 24h." }, 502);
    }

    if (cacheKey) await cacheSet(cacheKey, parsed, usedModel);

    const shareToken = await saveAnalysis({
      hash: cacheKey,
      mode,
      sourceUrl,
      photoCount,
      context,
      model: usedModel,
      cached: false,
      analysis: parsed as Record<string, unknown>,
    });

    return json({
      ok: true,
      mode,
      source_url: sourceUrl,
      model: usedModel,
      cached: false,
      analysis: parsed,
      share_token: shareToken,
    });
  } catch (e) {
    console.error("analysis failed", (e as Error).message);
    return json({ error: "analysis_failed" }, 500);
  }
});
