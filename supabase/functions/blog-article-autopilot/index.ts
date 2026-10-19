// Blog Article Draft Auto-Pilot
// Generează periodic CÂTE UN DRAFT de articol de blog (is_published=false, ai_pending_review=true),
// pe baza datelor reale din platformă (zone active, tipuri de anunțuri). Fără inventare de cifre.
// Publicarea rămâne manuală/programată din Admin (panoul "Auto-pilot Articole").
// Reguli: 1 articol/rulare, lease orchestrator, circuit breaker 402/403, pauză persistentă în automation_jobs.config.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";

const JOB_KEY = "blog.article_draft_autopilot";
const AUTHOR = "RealTrust Auto-Pilot";
const MAX_PENDING_DRAFTS = 5;
const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.8-flash";

// Zone canonice (mem: doar Centru/Cetate, Iosefin, Fabric, Dumbrăvița, Aradului).
// Tokenii includ repere stradale frecvente în `properties.location` (adrese complete).
const ZONES = [
  { zone: "Cetate/Centru", tokens: ["cetate", "centru", "revolutiei", "unirii", "victoriei", "baranutiu", "brediceanu", "coriolan", "alba iulia", "hungaria", "lloyd", "mercur"] },
  { zone: "Iosefin", tokens: ["iosefin", "josefin"] },
  { zone: "Fabric", tokens: ["fabric"] },
  { zone: "Dumbrăvița", tokens: ["dumbravita"] },
  { zone: "Aradului", tokens: ["aradului"] },
];

const VARIANTS = [
  {
    key: "regim_hotelier",
    angle: "regim hotelier",
    tokens: ["regim hotelier", "hotelier"],
    category: "Investiții",
    brief:
      "Un ghid pentru investitori despre regimul hotelier (cazare pe noapte) în zona dată: ce fel de apartamente merg bine, ce caută oaspeții, ocupare tipică și venituri. Folosește ROI-ul standardizat fix de mai jos, nu calcula alte cifre.",
  },
  {
    key: "inchiriere_lunara",
    angle: "închiriere lunară",
    tokens: ["închirieri lunare", "inchirieri lunare", "închirieri", "inchirieri", "închiriere lunară", "inchiriere lunara", "inchiriere-lunara", "chirii lunare", "chirie lunara", "închiriere", "inchiriere"],
    category: "Imobiliare",
    brief:
      "Un ghid despre închirierea lunară (regim clasic) în zona dată: profilul chiriașului, cererea, avantajele și limitele față de regimul hotelier. Nu da cifre de chirie dacă nu apar în datele de mai jos.",
  },
  {
    key: "vanzare_investitie",
    angle: "vânzare / investiție",
    tokens: ["de vânzare", "vânzare"],
    category: "Investiții",
    brief:
      "Un ghid pentru cumpărători/investitori despre apartamentele de vânzare în zona dată: ce tipuri de apartamente există, ce merită urmărit la cumpărare, de ce zona e atractivă. Nu da cifre de preț dacă nu apar în datele de mai jos.",
  },
];

// Constante fixe de brand (permise în text; orice altă cifră doar din datele reale)
const FIXED_FACTS = `Constante oficiale RealTrust (le poți folosi ca atare):
- Randament net standardizat regim hotelier: 9,4% pe an.
- Calculul folosește o ocupare de 75% și deducerea administrării/managementului de 15-20% din încasări.
- RealTrust activează în Timișoara (jud. Timiș). NU menționa București sau alte orașe.
- Nu folosi limbaj de agenție ("comision", "vânzător motivat", "urgență").`;

const SYSTEM_PROMPT = `Ești redactorul SEO al realtrust.ro (regim hotelier premium și imobiliare în Timișoara).
Scrii un articol complet în limba română, Markdown curat, factual, fără exagerări.
REGULI ABSOLUTE:
1. Folosești DOAR cifrele din "date reale" sau constantele oficiale fixe. NU inventezi prețuri, procente, statistici sau evenimente.
2. Nu menționi alte orașe. Totul se raportează la Timișoara.
3. Fără limbaj de agenție, fără presiune, fără clickbait mincinos.
4. Structura obligatorie (Markdown):
   # Titlu (sub 60 de caractere, cu zona + "Timișoara")
   > **Meta descriere:** 150-160 de caractere, cu cuvântul cheie principal
   **Cuvinte cheie:** 5-7 termeni separați prin " · "
   ## Introducere (2 paragrafe)
   ## Despre zona [Zonă] (profil, poziție, caracter)
   ## Piața imobiliară în [Zonă] (folosește doar datele reale + constantele fixe; dacă nu ai cifre, scrii calitativ)
   ## Ce merită urmărit (4-6 argumente bullet)
   ## Concluzie (CTA discret către RealTrust, fără telefon/email inventate)
5. Ton: profesionist, cald, concis. 700-1200 de cuvinte.`;

interface VariantDef { key: string; angle: string; tokens: string[]; category: string; brief: string; }
interface ZoneDef { zone: string; tokens: string[]; }

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function norm(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function matchZone(text: string, zones: ZoneDef[]): ZoneDef | null {
  const t = norm(text);
  for (const z of zones) if (z.tokens.some((tok) => t.includes(tok))) return z;
  return null;
}

function matchVariant(text: string, variants: VariantDef[]): VariantDef | null {
  const t = norm(text);
  for (const v of variants) if (v.tokens.some((tok) => t.includes(norm(tok)))) return v;
  return null;
}

function extractResponseText(data: any): string {
  // /v1/responses: data.output[] cu iteme message → content[] → output_text
  const parts: string[] = [];
  for (const item of data?.output ?? []) {
    if (item?.type === "message") {
      for (const c of item.content ?? []) {
        if (c?.type === "output_text" && c.text) parts.push(c.text);
      }
    }
  }
  return parts.join("");
}

async function generateArticle(sb: ReturnType<typeof createClient>, topic: { zone: ZoneDef; variant: VariantDef }, statsText: string, existingNote: string) {
  const userContent = `Scrie articolul pentru:
- ZONA: ${topic.zone.zone}
- UNGHIUL: ${topic.variant.angle}
${topic.variant.brief}

${FIXED_FACTS}

DATE REALE din platforma RealTrust (active acum):
${statsText || "(nu există anunțuri active în această zonă — scrie calitativ, fără cifre)"}

${existingNote}

Răspunde STRICT JSON conform schemei.`;

  const resp = await fetch(AI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
    },
    body: JSON.stringify({
      model: MODEL,
      reasoning_effort: "low",
      max_tokens: 16000,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "blog_article_draft",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["title", "slug", "excerpt", "meta_title", "meta_description", "category", "tags", "content_md"],
            properties: {
              title: { type: "string", description: "Titlu sub 60 caractere" },
              slug: { type: "string", description: "slug-cu-liniute, fara diacritice" },
              excerpt: { type: "string", description: "2 propoziții de prezentare" },
              meta_title: { type: "string", description: "max 60 caractere" },
              meta_description: { type: "string", description: "150-160 caractere" },
              category: { type: "string", enum: ["Investiții", "Imobiliare", "Ghiduri Oaspeți", "piață"] },
              tags: { type: "array", items: { type: "string" }, maxItems: 8 },
              content_md: { type: "string", description: "articolul complet în Markdown" },
            },
          },
        },
      },
    }),
  });

  if (!resp.ok) {
    const bodyText = await resp.text();
    const err: any = new Error(`AI ${resp.status}: ${bodyText.slice(0, 400)}`);
    err.status = resp.status;
    throw err;
  }
  const data = await resp.json();
  const text = String(data?.choices?.[0]?.message?.content ?? "").trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  if (!text) throw new Error("AI răspuns gol");
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("AI JSON invalid");
  }
  return parsed as {
    title: string; slug: string; excerpt: string; meta_title: string; meta_description: string;
    category: string; tags: string[]; content_md: string;
  };
}


// Optimizare SEO deterministă înainte de salvare: titlu/meta title ≤60 cu „Timișoara”,
// meta descriere 140–160 caractere tăiată la cuvânt, fallback din excerpt/conținut.
const cutWords = (s: string, n: number) => {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= n) return t;
  return t.slice(0, n + 1).replace(/\s+\S*$/, "").replace(/[\s,;:–-]+$/, "");
};
const stripMd = (s: string) => s.replace(/[#*_>`\[\]()!]/g, " ").replace(/\s+/g, " ").trim();
function withCity(s: string, zone: string, max: number) {
  let t = cutWords(s, max);
  if (!/timi[șs]oara/i.test(t)) {
    const suffix = " | Timișoara";
    t = cutWords(t, max - suffix.length) + suffix;
  }
  if (zone && !t.toLowerCase().includes(zone.split("/")[0].toLowerCase()) && t.length + zone.length + 3 <= max) {
    t = t.replace(/ \| Timișoara$/, "") + ` – ${zone.split("/")[0]}` + (/timi[șs]oara/i.test(t) ? "" : ", Timișoara");
  }
  return t;
}
function optimizeSeo<T extends { title: string; excerpt: string; meta_title: string; meta_description: string; content_md: string }>(a: T, zone: string): T {
  const title = withCity(a.title || a.meta_title || "", zone, 60);
  const metaTitle = withCity(a.meta_title || a.title || "", zone, 60);
  let desc = (a.meta_description || "").replace(/\s+/g, " ").trim();
  if (desc.length < 140) {
    const extra = stripMd(`${desc} ${a.excerpt || ""} ${a.content_md.replace(/^#.*$/gm, "")}`);
    desc = extra;
  }
  desc = cutWords(desc, 157);
  if (!/[.!?]$/.test(desc)) desc = desc.replace(/[.,;:]+$/, "") + ".";
  return { ...a, title, meta_title: metaTitle, meta_description: desc };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const gate = await requireInternalOrAdmin(req, corsHeaders);
  if (gate) return gate;

  let body: any = {};
  try { body = await req.json(); } catch { /* gol = ok */ }
  const dryRun = body?.dry_run === true;
  const isAdminManual = body?.triggered_by === "admin";
  // Subiect explicit din Centrul Auto-îmbunătățire (doar apel manual/intern).
  const ct = body?.custom_topic;
  const customTopic = ct && typeof ct.topic === "string" && ct.topic.trim().length >= 5
    ? { topic: ct.topic.trim().slice(0, 200), zone: typeof ct.zone === "string" ? ct.zone.slice(0, 80) : "", reason: typeof ct.reason === "string" ? ct.reason.slice(0, 500) : "" }
    : null;

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Pauză persistentă (circuit breaker 402/403) — adminul o poate debloca manual.
    const { data: jobRow } = await sb.from("automation_jobs").select("config").eq("job_key", JOB_KEY).maybeSingle();
    const cfg = ((jobRow?.config ?? {}) as Record<string, unknown>) ?? {};
    if (cfg.paused && !isAdminManual && !dryRun) {
      return new Response(JSON.stringify({ paused: true, reason: cfg.paused_reason ?? null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }
    if (isAdminManual && cfg.paused) {
      await sb.from("automation_jobs").update({ config: { ...cfg, paused: false, paused_reason: null } }).eq("job_key", JOB_KEY);
    }

    // Limită de siguranță: maxim MAX_PENDING_DRAFTS drafturi în așteptare
    const { count: pending } = await sb
      .from("blog_articles")
      .select("id", { count: "exact", head: true })
      .eq("ai_pending_review", true).eq("is_published", false);
    if (!dryRun && !customTopic && (pending ?? 0) >= MAX_PENDING_DRAFTS) {
      return new Response(JSON.stringify({ skipped: true, reason: `drafts_pending=${pending} (limită ${MAX_PENDING_DRAFTS})` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    // Topic: prima combinație zonă×unghi neacoperită, în ordine fixă de rotație
    const zones: ZoneDef[] = ZONES;
    const variants: VariantDef[] = VARIANTS;
    const { data: existing } = await sb.from("blog_articles").select("title, slug, created_at").order("created_at", { ascending: false }).limit(400);
    const covered = new Map<string, string>(); // `${zone.key}:${variant.key}` -> created_at
    for (const art of existing ?? []) {
      const z = matchZone(`${art.title} ${art.slug}`, zones);
      const v = matchVariant(`${art.title} ${art.slug}`, variants);
      if (z && v) {
        const k = `${z.zone}:${v.key}`;
        const prev = covered.get(k);
        if (!prev || (art.created_at ?? "") > prev) covered.set(k, art.created_at ?? "");
      }
    }

    // Statistici reale pe zonă din anunțurile active
    const { data: props } = await sb
      .from("properties")
      .select("location, listing_type, bedrooms, rooms, usable_area, base_price_per_night, weekend_price_per_night")
      .eq("is_active", true).limit(1000);

    const activeCountByZone = new Map<string, number>();
    for (const p of props ?? []) {
      const loc = matchZone(p.location ?? "", zones);
      if (loc) activeCountByZone.set(loc.zone, (activeCountByZone.get(loc.zone) ?? 0) + 1);
    }

    let topic: { zone: ZoneDef; variant: VariantDef } | null = null;
    // Candidați: combinațiile neacoperite, cele cu anunțuri active primește; fallback la cele acoperite mai vechi.
    const candidates: { zone: ZoneDef; variant: VariantDef }[] = [];
    for (const z of zones) for (const v of variants) candidates.push({ zone: z, variant: v });
    candidates.sort((a, b) => (activeCountByZone.get(b.zone.zone) ?? 0) - (activeCountByZone.get(a.zone.zone) ?? 0));

    topic = candidates.find((c) => !covered.has(`${c.zone.zone}:${c.variant.key}`)) ?? null;
    if (!topic) {
      // toate acoperite → reia combinația cu articolul cel mai vechi (refresh ciclic)
      let oldestKey: string | null = null; let oldestAt: string | null = null;
      for (const z of zones) for (const v of variants) {
        const k = `${z.zone}:${v.key}`; const at = covered.get(k) ?? "";
        if (oldestAt === null || at < oldestAt) { oldestAt = at; oldestKey = k; }
      }
      if (oldestKey) {
        const [zoneName, variantKey] = oldestKey.split(":");
        topic = { zone: zones.find((z) => z.zone === zoneName)!, variant: variants.find((v) => v.key === variantKey)! };
      }
    }
    if (customTopic) {
      const z = matchZone(`${customTopic.zone} ${customTopic.topic}`, zones) ?? { zone: "Timișoara", tokens: [] };
      topic = { zone: z, variant: {
        key: "custom", angle: customTopic.topic, tokens: [], category: "Imobiliare",
        brief: `Subiectul exact al articolului: „${customTopic.topic}”. Context din date: ${customTopic.reason || "—"}. Adaptează totul la Timișoara.`,
      } };
    }
    if (!topic) return new Response(JSON.stringify({ skipped: true, reason: "no_topic" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });

    if (dryRun) {
      return new Response(JSON.stringify({ dry_run: true, topic: `${topic.zone.zone} · ${topic.variant.angle}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    const zoneProps = (props ?? []).filter((p: any) => {
      const loc = matchZone(p.location ?? "", zones);
      return loc?.zone === topic!.zone.zone;
    });
    const lines: string[] = [];
    for (const lt of ["regim_hotelier", "inchiriere", "vanzare"]) {
      const subset = zoneProps.filter((p: any) => (p.listing_type ?? "") === lt);
      if (subset.length) {
        const beds = subset.map((p: any) => Number(p.bedrooms ?? p.rooms ?? 0)).filter((n) => n > 0);
        const areas = subset.map((p: any) => Number(p.usable_area ?? 0)).filter((n) => n > 0);
        const nights = subset.map((p: any) => Number(p.base_price_per_night ?? 0)).filter((n) => n > 0);
        lines.push(
          `- ${lt}: ${subset.length} anunțuri active` +
            (beds.length ? `, camere ${Math.min(...beds)}-${Math.max(...beds)}` : "") +
            (areas.length ? `, suprafață ${Math.min(...areas)}-${Math.max(...areas)} mp` : "") +
            (nights.length ? `, tarif noapte ${Math.min(...nights)}-${Math.max(...nights)} €` : "")
        );
      }
    }
    if (!lines.length && zoneProps.length) lines.push(`- ${zoneProps.length} anunțuri active în zonă (detalii neprecizate)`);
    const statsText = lines.join("\n");
    const existingNote = `Există deja ${covered.size} articole tematice în blog; articolul nou NU trebuie să repete structura sau titlurile lor.`;

    const article = optimizeSeo(await generateArticle(sb, topic, statsText, existingNote), topic.zone.zone);

    const cleanSlug = slugify(article.slug || article.title);
    if (!cleanSlug || !article.title || !article.content_md) throw new Error("AI incomplet: lipsesc câmpuri obligatorii");
    let slug = cleanSlug;
    for (let i = 2; i <= 20; i++) {
      const { data: dup } = await sb.from("blog_articles").select("id").eq("slug", slug).maybeSingle();
      if (!dup) break;
      slug = `${cleanSlug}-${i}`;
    }

    const { data: insRow, error: insErr } = await sb.from("blog_articles").insert({
      slug,
      title: article.title.slice(0, 200),
      excerpt: (article.excerpt ?? "").slice(0, 500),
      content: article.content_md,
      category: article.category ?? topic.variant.category,
      tags: Array.isArray(article.tags) ? article.tags.slice(0, 8) : [],
      author_name: AUTHOR,
      is_published: false,
      ai_pending_review: true,
      meta_title: (article.meta_title ?? "").slice(0, 200) || null,
      meta_description: (article.meta_description ?? "").slice(0, 300) || null,
    }).select("id").maybeSingle();
    if (insErr) throw new Error(`insert: ${insErr.message}`);

    return new Response(JSON.stringify({ created: true, id: insRow?.id ?? null, slug, title: article.title, topic: `${topic.zone.zone} · ${topic.variant.angle}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (e: any) {
    const status = Number(e?.status ?? 0);
    // Circuit breaker: pauză persistentă la 402/403 (credite / acces refuzat)
    if (status === 402 || status === 403) {
      const { data: jobRow } = await sb.from("automation_jobs").select("config").eq("job_key", JOB_KEY).maybeSingle();
      const cfg = ((jobRow?.config ?? {}) as Record<string, unknown>) ?? {};
      await sb.from("automation_jobs").update({ config: { ...cfg, paused: true, paused_reason: e.message } }).eq("job_key", JOB_KEY);
      return new Response(JSON.stringify({ paused: true, reason: e.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }
    return new Response(JSON.stringify({ error: e?.message ?? "eroare necunoscută" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  }
});
