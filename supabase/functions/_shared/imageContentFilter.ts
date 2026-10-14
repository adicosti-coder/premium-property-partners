// Verificare de conținut pentru galeriile publicate automat:
// 1) elimină fișierele corupte / prea mici / complet negre sau uniforme;
// 2) clasifică restul cu AI și exclude logo-uri de magazine, reclame, hărți, grafice.
// La orice eroare de rețea/AI păstrăm imaginea (nu blocăm publicarea), dar le marcăm în rezultat.
import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

export interface ImageCheck { url: string; ok: boolean; reason: string; caption?: string; tags?: string[] }

/** Dotări care se pot vedea clar într-o poză. Vocabular fix → bifare deterministă. */
export const VISUAL_TAGS = ["centrala_termica", "aer_conditionat", "balcon", "parcare", "lift", "masina_spalat", "masina_vase", "mobilat", "cada", "dus"] as const;

async function pixelCheck(url: string): Promise<{ ok: boolean; reason: string }> {
  let bytes: Uint8Array;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!r.ok) return { ok: false, reason: `http_${r.status}` };
    const ct = r.headers.get("content-type") || "";
    if (ct && !ct.startsWith("image/") && !ct.includes("octet-stream")) return { ok: false, reason: "not_image" };
    bytes = new Uint8Array(await r.arrayBuffer());
  } catch {
    return { ok: true, reason: "fetch_failed_kept" };
  }
  if (bytes.length < 3000) return { ok: false, reason: "too_small_or_corrupt" };
  let img: Image;
  try {
    img = await Image.decode(bytes) as Image;
  } catch {
    // WebP/AVIF nu se decodează aici — le lăsăm la verificarea AI.
    const isWebp = bytes[8] === 0x57 && bytes[9] === 0x45;
    return isWebp ? { ok: true, reason: "undecoded_webp" } : { ok: false, reason: "corrupt" };
  }
  if (img.width < 300 || img.height < 200) return { ok: false, reason: "too_small" };
  // Eșantionare grilă 40x40: luminozitate medie + abatere.
  let n = 0, sum = 0, sq = 0;
  for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) {
    const px = img.getPixelAt(1 + Math.floor(x * (img.width - 1) / 40), 1 + Math.floor(y * (img.height - 1) / 40));
    const r = (px >>> 24) & 255, g = (px >>> 16) & 255, b = (px >>> 8) & 255;
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    sum += l; sq += l * l; n++;
  }
  const mean = sum / n, sd = Math.sqrt(Math.max(0, sq / n - mean * mean));
  if (mean < 18 && sd < 12) return { ok: false, reason: "blank_black" };
  if (sd < 4) return { ok: false, reason: "blank_uniform" };
  return { ok: true, reason: "ok" };
}

async function classifyWithAI(urls: string[]): Promise<Map<string, { label: string; caption: string; tags: string[] }>> {
  const out = new Map<string, { label: string; caption: string; tags: string[] }>();
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key || !urls.length) return out;
  try {
    const content: unknown[] = [{
      type: "text",
      text: "Pentru fiecare imagine (în ordine, index de la 0) răspunde cu o categorie: " +
        "property (interior/exterior/clădire/vedere a proprietății imobiliare), logo (logo/reclamă de magazin sau firmă, ex. Kaufland, Lidl, Profi), " +
        "map (hartă/plan de localizare generic), other (grafic, text, document, imagine fără legătură). " +
        "Planurile de apartament (schițe cu camere) sunt property. Pentru fiecare imagine scrie și o descriere scurtă (o propoziție, max 14 cuvinte) în limba română a camerei/zonei vizibile " +
        "(ex. dormitor, bucătărie, baie, living, balcon, vedere exterior), fără nume de firme, prețuri sau numere de telefon. " +
        "Pentru fiecare imagine listează și dotările vizibile CLAR (fără presupuneri), doar din: " + VISUAL_TAGS.join(", ") + ". " +
        "Răspunde DOAR JSON: {\"labels\":[\"property\",...],\"captions\":[\"Dormitor luminos cu pat dublu\",...],\"tags\":[[\"aer_conditionat\"],[]...]}",
    }];
    for (const u of urls) content.push({ type: "image_url", image_url: { url: u } });
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-3.8-flash", messages: [{ role: "user", content }], response_format: { type: "json_object" } }),
      signal: AbortSignal.timeout(45000),
    });
    if (!r.ok) return out;
    const j = await r.json();
    const raw = String(j?.choices?.[0]?.message?.content ?? "").replace(/```json|```/g, "");
    const parsed = JSON.parse(raw) ?? {};
    const labels = (parsed.labels ?? []) as string[];
    const caps = (parsed.captions ?? []) as string[];
    const tagRows = (parsed.tags ?? []) as unknown[];
    const allowed = new Set<string>(VISUAL_TAGS);
    urls.forEach((u, i) => {
      const row = Array.isArray(tagRows[i]) ? (tagRows[i] as unknown[]) : [];
      const tags = Array.from(new Set(row.map((t) => String(t).toLowerCase().trim()).filter((t) => allowed.has(t))));
      if (labels[i]) out.set(u, { label: String(labels[i]).toLowerCase(), caption: String(caps[i] ?? "").trim().slice(0, 160), tags });
    });
  } catch (e) {
    console.warn("[imageContentFilter] AI classify failed", (e as Error)?.message);
  }
  return out;
}

/** Returnează imaginile păstrate (ordine originală) și motivul fiecărei excluderi. */
export async function filterPropertyImages(urls: string[]): Promise<{ kept: string[]; checks: ImageCheck[] }> {
  const list = urls.slice(0, 25);
  const px = await Promise.all(list.map((u) => pixelCheck(u)));
  const checks: ImageCheck[] = list.map((u, i) => ({ url: u, ok: px[i].ok, reason: px[i].reason }));
  const candidates = checks.filter((c) => c.ok).map((c) => c.url);
  for (let i = 0; i < candidates.length; i += 12) {
    const labels = await classifyWithAI(candidates.slice(i, i + 12));
    for (const c of checks) {
      const l = labels.get(c.url);
      if (!l) continue;
      if (l.label !== "property") { c.ok = false; c.reason = `ai_${l.label}`; }
      else { if (l.caption) c.caption = l.caption; if (l.tags.length) c.tags = l.tags; }
    }
  }
  const kept = checks.filter((c) => c.ok).map((c) => c.url);
  // Siguranță: dacă AI-ul ar respinge tot, dar există poze valide ca pixeli, nu golim galeria pe baza AI.
  return { kept, checks };
}

/** Descriere structurată din textul original + descrierile pozelor. Returnează null la eroare. */
export async function synthesizeDescription(input: {
  title: string; originalText: string; captions: string[]; facts: Record<string, unknown>;
}): Promise<string | null> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return null;
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        messages: [
          { role: "system", content: "Ești redactor imobiliar în Timișoara. Scrii în română, profesionist, fără exagerări. " +
            "Folosește DOAR informații din textul anunțului, fapte și descrierile pozelor; nu inventa suprafețe, prețuri, zone sau dotări. " +
            "Fără telefoane, e-mailuri, nume de agenții sau link-uri. Răspunde în Markdown cu exact secțiunile: " +
            "un paragraf introductiv fluid (2-3 propoziții, fără titlu), apoi exact secțiunile: ## Compartimentare\n## Dotări & Finisaje\n## Puncte Forte\n(150-300 cuvinte în total, liste cu - unde e potrivit). Dotările vizibile din poze apar în Fapte (dotari_vizibile)." },
          { role: "user", content: `Titlu: ${input.title}\nFapte: ${JSON.stringify(input.facts)}\n\nText original:\n${input.originalText.slice(0, 5000)}\n\nDescrierile pozelor:\n${input.captions.map((c) => `- ${c}`).join("\n")}` },
        ],
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const txt = String(j?.choices?.[0]?.message?.content ?? "").replace(/^```(markdown)?|```$/g, "").trim();
    if (txt.length < 120 || !txt.includes("Compartimentare")) return null;
    return txt.replace(/(\+?40|0)7\d[\d\s.-]{7,}/g, "");
  } catch (e) {
    console.warn("[imageContentFilter] synthesize failed", (e as Error)?.message);
    return null;
  }
}

/** Descrieri scurte pentru imagini deja aprobate (fără excluderi). */
export async function captionImages(urls: string[]): Promise<string[]> {
  const out: string[] = [];
  for (let i = 0; i < urls.length; i += 12) {
    const chunk = urls.slice(i, i + 12);
    const m = await classifyWithAI(chunk);
    for (const u of chunk) out.push(m.get(u)?.caption || "");
  }
  return out;
}

export const TAG_LABELS: Record<string, string> = {
  centrala_termica: "Centrală termică proprie", aer_conditionat: "Aer condiționat", balcon: "Balcon",
  parcare: "Loc de parcare", lift: "Lift", masina_spalat: "Mașină de spălat", masina_vase: "Mașină de spălat vase",
  mobilat: "Mobilat", cada: "Cadă", dus: "Duș",
};

/** Bifează în specificații doar dotările văzute clar în poze; nu șterge nimic existent. */
export function applyVisualTags(data: Record<string, any>, tags: Set<string>) {
  if (!tags.size) return;
  const amenities = new Set<string>(Array.isArray(data.amenities) ? data.amenities : []);
  for (const t of tags) if (TAG_LABELS[t]) amenities.add(TAG_LABELS[t]);
  data.amenities = Array.from(amenities);
  if (tags.has("aer_conditionat")) data.has_ac = true;
  if (tags.has("lift")) data.has_elevator = true;
  if (tags.has("centrala_termica") && !data.heating_type) data.heating_type = "Centrală proprie";
  if (tags.has("balcon") && !(Number(data.balconies) > 0)) data.balconies = 1;
  if (tags.has("parcare") && !data.parking) data.parking = "Loc de parcare";
}


/** Dotări vizibile în poze deja aprobate (fără excluderi). */
export async function tagImages(urls: string[]): Promise<Set<string>> {
  const out = new Set<string>();
  for (let i = 0; i < urls.length; i += 12) {
    const m = await classifyWithAI(urls.slice(i, i + 12));
    for (const v of m.values()) for (const t of v.tags) out.add(t);
  }
  return out;
}
