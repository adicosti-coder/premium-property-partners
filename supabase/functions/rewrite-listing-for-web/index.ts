// Edge Function: rewrite-listing-for-web
// Curăță + rescrie un anunț brut înainte de publicarea pe realtrust.ro.
// Sanitizare deterministă (înainte ȘI după AI) + rescriere prin Lovable AI (Responses, streaming).
import { createOpenAI } from "npm:@ai-sdk/openai@2";
import { streamText } from "npm:ai@5";
import { requireAdmin } from "../_shared/adminAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-lovable-aig-run-id",
  "Access-Control-Expose-Headers": "X-Lovable-AIG-Run-ID",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MODEL = "openai/gpt-6-astra";

// ---------- Sanitizare deterministă ----------
const PHONE = /(?:\+?\d[\d\s.\-()]{7,}\d)/g;
const EMAIL = /[\w.%+\-]+@[\w.\-]+\.[a-z]{2,}/gi;
const URL_RE = /\b(?:https?:\/\/|www\.)\S+|\b[\w\-]+\.(?:ro|com|eu|net|org)\b(?:\/\S*)?/gi;
const STREET =
  /\b(?:str\.?|strada|bd\.?|bdul\.?|bulevardul|calea|aleea|splaiul|pia[țt]a|intrarea|[șs]os\.?|[șs]oseaua|drumul)\s+[^\n,.;]{2,40}?(?:\s*(?:nr\.?|num[aă]rul)\s*\d+[a-z]?)?(?=[\n,.;]|$)/gi;
const BLOCK_APT = /\b(?:bl\.?|bloc(?:ul)?|sc\.?|scara|nr\.?)\s*(?:[A-Z]?\d+[A-Za-z]?|[A-Z]\d*)\b/gi;
const FORBIDDEN = [
  "persoana fizica", "persoană fizică", "fara comision", "fără comision", "comision 0%", "comision 0 %",
  "0% comision", "agentii", "agenții", "agentie", "agenție", "agentia", "agenția", "imobiliare",
  "proprietar", "proprietarul", "proprietari", "PF",
];
const ABBREV: [RegExp, string][] = [
  [/\bdec\.?(?=\s|,|$)/gi, "decomandat"],
  [/\bsemidec\.?(?=\s|,|$)/gi, "semidecomandat"],
  [/\bcf\.?\s*1\b/gi, "confort 1"],
  [/\bcf\.?\s*2\b/gi, "confort 2"],
  [/\bap\.?(?=\s)/gi, "apartament"],
  [/\bet\.?\s*(\d+)/gi, "etajul $1"],
  [/\bmp\b/gi, "metri pătrați"],
  [/\bcam\.?(?=\s)/gi, "camere"],
  [/\bmob\.?(?=\s)/gi, "mobilat"],
  [/\butil\.?(?=\s)/gi, "utilat"],
  [/\bct\b/gi, "centrală termică"],
];
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function sanitize(text: string, expandAbbrev = true): string {
  let out = String(text ?? "");
  out = out.replace(EMAIL, "").replace(URL_RE, "").replace(PHONE, (m) =>
    m.replace(/\D/g, "").length >= 9 ? "" : m);
  out = out.replace(STREET, "").replace(BLOCK_APT, "").replace(/\b(?:ap\.?|apartamentul)\s*\d+[a-z]?\b(?!\s*(?:cam|camere|camera)\b)/gi, "");
  for (const w of FORBIDDEN.sort((a, b) => b.length - a.length)) {
    const flags = w === "PF" ? "g" : "giu";
    out = out.replace(new RegExp(`(?<![\\p{L}\\p{N}])${esc(w)}(?![\\p{L}\\p{N}])`, flags), "");
  }
  if (expandAbbrev) for (const [re, rep] of ABBREV) out = out.replace(re, rep);
  return out.replace(/\(\s*\)/g, "").replace(/[ \t]+([,.;:!?])/g, "$1").replace(/([,.;:])(?:\s*[,.;:])+/g, "$1").replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n").trim();
}

const SYSTEM = `Ești copywriter imobiliar premium pentru RealTrust Timișoara. Scrii DOAR în română, cu diacritice.
Reguli stricte:
- Nu include niciodată numere de telefon, e-mailuri, linkuri sau adrese exacte (stradă, număr, bloc, scară, apartament).
- Nu folosi cuvintele: proprietar, persoană fizică, PF, fără comision, agenție, agenții, imobiliare, comision 0%.
- Scrie cuvintele întregi (decomandat, confort 1, apartament, etajul), fără prescurtări.
- Nu inventa date: folosește doar informațiile din anunț. Dacă lipsește ceva, omite.
- Zona trebuie să fie un cartier din Timișoara (ex: Cetate, Iosefin, Fabric, Elisabetin, Dumbrăvița, Calea Aradului).
Returnează EXCLUSIV un obiect JSON valid, fără markdown, cu cheile:
{"clean_title": string, "clean_description": string, "neighborhood": string|null, "property_type": string|null, "price": number|null}
- clean_title: format „[Tip Proprietate] [Beneficiu cheie] – Zona [Cartier]”, max ~80 caractere.
- clean_description: Markdown cu exact 4 secțiuni, în ordine, cu titluri „### ”:
  1) Beneficiul principal (2-3 propoziții captivante)
  2) Dotări și specificații (listă cu „- ”)
  3) Avantajele zonei (vecinătăți, fără adresă exactă)
  4) Programează o vizionare (invitație către echipa RealTrust)
- price: număr în EUR (fără simbol) sau null.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = await requireAdmin(req, corsHeaders);
  if (!auth.ok) return auth.response!;

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json({ error: "LOVABLE_API_KEY lipsește" }, 500);

  const body = await req.json().catch(() => null);
  const title = String(body?.title ?? "").slice(0, 500);
  const description = String(body?.description ?? body?.text ?? "").slice(0, 12000);
  if (!title && !description) return json({ error: "Trimite `title` și/sau `description`" }, 400);

  const hints = {
    zona: body?.neighborhood ?? body?.zone ?? null,
    tip: body?.property_type ?? null,
    pret: body?.price ?? null,
    camere: body?.rooms ?? null,
    suprafata: body?.surface ?? null,
    tip_tranzactie: body?.listing_type ?? null,
  };
  const pre = `TITLU: ${sanitize(title)}\n\nDESCRIERE:\n${sanitize(description)}\n\nDATE STRUCTURATE: ${JSON.stringify(hints)}`;

  let runId: string | undefined = req.headers.get("X-Lovable-AIG-Run-ID")?.trim() || undefined;
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (input, init) => {
      const h = new Headers(init?.headers);
      if (runId && !h.has("X-Lovable-AIG-Run-ID")) h.set("X-Lovable-AIG-Run-ID", runId);
      const r = await fetch(input, { ...init, headers: h });
      runId ??= r.headers.get("X-Lovable-AIG-Run-ID")?.trim() || undefined;
      return r;
    },
  });

  let raw = "";
  try {
    const result = streamText({
      model: provider.responses(MODEL),
      system: SYSTEM,
      messages: [{ role: "user", content: `Rescrie anunțul pentru realtrust.ro. Răspunde în JSON.\n\n${pre}` }],
      abortSignal: req.signal,
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    raw = await result.text;
  } catch (e: any) {
    const status = Number(e?.statusCode ?? e?.status ?? 0);
    console.error("rewrite-listing-for-web AI error", status, e?.message);
    if (status === 429) return json({ error: "Prea multe cereri AI. Reîncearcă puțin mai târziu." }, 429);
    if (status === 402) return json({ error: "Credite AI insuficiente. Adaugă credite din Settings → Plans & credits." }, 402);
    if (status === 403) return json({ error: e?.message || "Acces AI refuzat." }, 403);
    if (req.signal.aborted) return json({ error: "Anulat" }, 499);
    return json({ error: "Eroare la rescrierea anunțului." }, 502);
  }

  const m = raw.match(/\{[\s\S]*\}/);
  let parsed: any = null;
  try { parsed = m ? JSON.parse(m[0]) : null; } catch { /* ignore */ }
  if (!parsed || typeof parsed !== "object") {
    return json({ error: "AI nu a returnat JSON valid.", raw: raw.slice(0, 1000) }, 502);
  }

  const priceNum = Number(String(parsed.price ?? hints.pret ?? "").replace(/[^\d.]/g, ""));
  const out = {
    clean_title: sanitize(String(parsed.clean_title ?? ""), false),
    clean_description: sanitize(String(parsed.clean_description ?? ""), false),
    neighborhood: parsed.neighborhood ? String(parsed.neighborhood) : (hints.zona ?? null),
    property_type: parsed.property_type ? String(parsed.property_type) : (hints.tip ?? null),
    price: Number.isFinite(priceNum) && priceNum > 0 ? priceNum : null,
  };
  const h: Record<string, string> = { ...corsHeaders, "Content-Type": "application/json" };
  if (runId) h["X-Lovable-AIG-Run-ID"] = runId;
  return new Response(JSON.stringify(out), { headers: h });
});
