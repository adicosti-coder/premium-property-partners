// Shared Lovable AI Gateway client: one key lookup, primary + fallback model,
// bounded retries on 429/5xx (via fetchWithRetry), structured JSON output and
// uniform error mapping. 402/403 are terminal and never fall back.
import { fetchWithRetry } from "./fetchRetry.ts";

export const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
export const MODELS = {
  vision: "google/gemini-3.8-flash",
  image: "google/gemini-3.1-flash-lite-image",
  text: "google/gemini-3.8-flash",
  cheap: "google/gemini-3.1-flash-lite",
  fallback: "openai/gpt-6-luna",
} as const;

export class AIError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function aiKey(): string {
  const k = Deno.env.get("LOVABLE_API_KEY");
  if (!k) throw new AIError(500, "LOVABLE_API_KEY not configured");
  return k;
}

export interface CallOpts {
  model: string;
  fallbackModel?: string | null;
  messages: unknown[];
  schema?: { name: string; schema: Record<string, unknown> };
  timeoutMs?: number;
  label?: string;
}

async function once(model: string, o: CallOpts) {
  const body: Record<string, unknown> = { model, messages: o.messages };
  if (o.schema) {
    body.response_format = { type: "json_schema", json_schema: { name: o.schema.name, strict: true, schema: o.schema.schema } };
  }
  return await fetchWithRetry(AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${aiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, { maxAttempts: 3, timeoutMs: o.timeoutMs ?? 45_000, label: o.label ?? "ai", maxBodyChars: 200_000 });
}

/** Returns { content, model }. content is parsed JSON when a schema is given. */
export async function callAI(o: CallOpts): Promise<{ content: any; model: string }> {
  const models = [o.model, ...(o.fallbackModel ? [o.fallbackModel] : [])];
  let last: AIError | null = null;
  for (const m of models) {
    const r = await once(m, o);
    if (r.ok) {
      const text = JSON.parse(r.body)?.choices?.[0]?.message?.content?.trim?.() ?? "";
      if (!text) { last = new AIError(502, "Empty AI response"); continue; }
      if (!o.schema) return { content: text, model: m };
      try {
        return { content: JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, "")), model: m };
      } catch { last = new AIError(502, "Invalid JSON from AI"); continue; }
    }
    if (r.status === 402) throw new AIError(402, "Credits exhausted");
    if (r.status === 403) throw new AIError(403, "AI access denied");
    if (r.status === 400) throw new AIError(400, "Invalid AI request");
    last = new AIError(r.status === 429 ? 429 : 502, r.status === 429 ? "Rate limited" : `AI gateway ${r.status || "network"}`);
  }
  throw last ?? new AIError(502, "AI failed");
}

export async function sha256(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
