// ai-text-generation handler with sha256 cache in public.ai_text_cache.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI, MODELS, AIError, sha256 } from "./aiClient.ts";

export type TextAction = "TRANSLATE" | "SEO_OPTIMIZE" | "GENERATE_DESCRIPTION" | "EXTRACT_AMENITIES";
const PROMPT_VERSION = "v2";

const LANGS: Record<string, string> = { ro: "Romanian", en: "English", de: "German", fr: "French", it: "Italian", es: "Spanish", hu: "Hungarian" };
const langName = (v: unknown, d: string) => {
  const k = typeof v === "string" ? v.trim().toLowerCase().slice(0, 2) : "";
  return LANGS[k] ?? d;
};

const obj = (props: Record<string, unknown>) => ({ type: "object", additionalProperties: false, required: Object.keys(props), properties: props });

function build(action: TextAction, text: string, src: string, tgt: string) {
  switch (action) {
    case "TRANSLATE":
      return { model: MODELS.cheap, schema: undefined, system: `You are a professional real estate translator. Translate ${src} text to ${tgt}. Keep tone and structure. Return ONLY the translation.` };
    case "SEO_OPTIMIZE":
      return { model: MODELS.text, schema: { name: "seo", schema: obj({ meta_title: { type: "string" }, meta_description: { type: "string" }, keywords: { type: "array", items: { type: "string" } } }) },
        system: `You are an SEO expert for real estate in Timișoara, Romania. In ${tgt}, write meta_title (max 60 chars), meta_description (max 155 chars) and 5-8 keywords for the text.
meta_description rules:
- ONLY relevant keywords, location/neighborhood, main amenities and unique property features.
- NO calls to action or sales phrases at the end or anywhere (forbidden: "Contactează-ne pentru detalii!", "Află mai multe!", "Suntem la un apel distanță!", "Vezi mai jos", "Înregistrează-te", or any invitation to contact/visit/learn more).
- Max 155 characters (never above 160). Front-load the most important keywords and the location.
- Never invent facts, prices or locations.` };
    case "GENERATE_DESCRIPTION":
      return { model: MODELS.text, schema: undefined, system: `Rewrite the property information into a professional listing description in ${tgt} (120-220 words). Use only facts present in the input. No contact data, no portal footers.` };
    case "EXTRACT_AMENITIES":
      return { model: MODELS.cheap, schema: { name: "amenities", schema: obj({ amenities: { type: "array", items: { type: "string" } } }) },
        system: `Extract amenities explicitly mentioned in the text as short ${tgt} labels. Do not infer anything not written.` };
  }
}

export async function runTextAction(body: any) {
  const action = String(body?.action || "").toUpperCase() as TextAction;
  if (!["TRANSLATE", "SEO_OPTIMIZE", "GENERATE_DESCRIPTION", "EXTRACT_AMENITIES"].includes(action)) throw new AIError(400, "Invalid action");
  const text = typeof body?.text === "string" ? body.text : "";
  if (!text.trim() || text.length > 20_000) throw new AIError(400, "text is required (max 20000 chars)");
  const src = langName(body.sourceLang, "Romanian");
  const tgt = langName(body.targetLang, action === "TRANSLATE" ? "English" : "Romanian");
  const cfg = build(action, text, src, tgt);
  const key = await sha256([action, src, tgt, PROMPT_VERSION, text].join("|"));

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  if (!body?.skipCache) {
    const { data: hit } = await sb.from("ai_text_cache").select("id, output, hits").eq("cache_key", key).maybeSingle();
    if (hit) {
      sb.from("ai_text_cache").update({ hits: (hit.hits ?? 0) + 1 }).eq("id", hit.id).then(() => {});
      return { action, result: hit.output, cached: true };
    }
  }

  const { content, model } = await callAI({
    model: cfg.model,
    fallbackModel: MODELS.fallback,
    schema: cfg.schema,
    label: `ai-text.${action}`,
    messages: [{ role: "system", content: cfg.system }, { role: "user", content: text }],
  });
  const { error } = await sb.from("ai_text_cache").upsert(
    { cache_key: key, action, lang: tgt, prompt_version: PROMPT_VERSION, output: content, model },
    { onConflict: "cache_key" },
  );
  if (error) console.warn("[ai-text] cache write failed", error.message);
  return { action, result: content, cached: false, model };
}
