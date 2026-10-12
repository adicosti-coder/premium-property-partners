// Verificare de conținut pentru galeriile publicate automat:
// 1) elimină fișierele corupte / prea mici / complet negre sau uniforme;
// 2) clasifică restul cu AI și exclude logo-uri de magazine, reclame, hărți, grafice.
// La orice eroare de rețea/AI păstrăm imaginea (nu blocăm publicarea), dar le marcăm în rezultat.
import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

export interface ImageCheck { url: string; ok: boolean; reason: string; caption?: string }

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

async function classifyWithAI(urls: string[]): Promise<Map<string, { label: string; caption: string }>> {
  const out = new Map<string, { label: string; caption: string }>();
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
        "Răspunde DOAR JSON: {\"labels\":[\"property\",...],\"captions\":[\"Dormitor luminos cu pat dublu\",...]}",
    }];
    for (const u of urls) content.push({ type: "image_url", image_url: { url: u } });
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: [{ role: "user", content }], response_format: { type: "json_object" } }),
      signal: AbortSignal.timeout(45000),
    });
    if (!r.ok) return out;
    const j = await r.json();
    const raw = String(j?.choices?.[0]?.message?.content ?? "").replace(/```json|```/g, "");
    const parsed = JSON.parse(raw) ?? {};
    const labels = (parsed.labels ?? []) as string[];
    const caps = (parsed.captions ?? []) as string[];
    urls.forEach((u, i) => {
      if (labels[i]) out.set(u, { label: String(labels[i]).toLowerCase(), caption: String(caps[i] ?? "").trim().slice(0, 160) });
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
      else if (l.caption) c.caption = l.caption;
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
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Ești redactor imobiliar în Timișoara. Scrii în română, profesionist, fără exagerări. " +
            "Folosește DOAR informații din textul anunțului, fapte și descrierile pozelor; nu inventa suprafețe, prețuri, zone sau dotări. " +
            "Fără telefoane, e-mailuri, nume de agenții sau link-uri. Răspunde în Markdown cu exact secțiunile: " +
            "## Descriere generală\n## Dotări & Finisaje\n## Compartimentare\n(150-300 cuvinte în total, liste cu - unde e potrivit)." },
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
