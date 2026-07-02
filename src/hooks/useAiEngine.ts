import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { supabaseConfig, getSupabasePublishableKey } from "@/lib/supabaseClient";

export type AiEngineModel =
  | "z-ai/glm-5.2"
  | "google/gemini-3.1-pro-preview"
  | "google/gemini-3.1-flash-lite-preview";

export interface AiEngineRequest {
  prompt: string;
  systemPrompt?: string;
  model?: AiEngineModel;
  jsonMode?: boolean;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

export interface AiEngineResponse<T = unknown> {
  model: string;
  text: string;
  json: T | null;
  usage: unknown;
}

export class AiEngineError extends Error {
  status?: number;
  details?: unknown;
  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = "AiEngineError";
    this.status = status;
    this.details = details;
  }
}

const FUNCTION_URL = `${supabaseConfig.url}/functions/v1/openrouter-ai`;

/** Safely parse JSON returned by the model; strips ```json fences if any. */
export function safeParseJson<T = unknown>(text: string): T | null {
  if (!text) return null;
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // try to extract first {...} block
    const m = cleaned.match(/\{[\s\S]*\}$/);
    if (m) {
      try { return JSON.parse(m[0]) as T; } catch { /* noop */ }
    }
    return null;
  }
}

/** Non-streaming call via supabase.functions.invoke */
export async function callAiEngine<T = unknown>(
  input: AiEngineRequest,
): Promise<AiEngineResponse<T>> {
  const { data, error } = await supabase.functions.invoke<
    AiEngineResponse<T> & { error?: string; details?: unknown }
  >("openrouter-ai", { body: { ...input, stream: false } });

  if (error) {
    throw new AiEngineError(
      error.message || "Eroare la apelarea motorului AI",
      (error as any).status,
      error,
    );
  }
  if (!data) throw new AiEngineError("Răspuns gol de la motorul AI");
  if ((data as any).error) {
    throw new AiEngineError(String((data as any).error), undefined, (data as any).details);
  }
  return data;
}

/** Streaming call — invokes the SSE endpoint and pushes deltas via onDelta. */
export async function streamAiEngine<T = unknown>(
  input: AiEngineRequest,
  handlers: {
    onDelta?: (delta: string, accumulated: string) => void;
    signal?: AbortSignal;
  } = {},
): Promise<AiEngineResponse<T>> {
  const apiKey = getSupabasePublishableKey();
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      apikey: apiKey,
    },
    body: JSON.stringify({ ...input, stream: true }),
    signal: handlers.signal,
  });

  if (!res.ok || !res.body) {
    let details: unknown = null;
    try { details = await res.json(); } catch { /* noop */ }
    throw new AiEngineError(
      `Motorul AI a răspuns cu ${res.status}`,
      res.status,
      details,
    );
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let acc = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data:")) continue;
      const p = line.slice(5).trim();
      if (!p || p === "[DONE]") continue;
      try {
        const obj = JSON.parse(p);
        if (obj.error) throw new AiEngineError(String(obj.error));
        if (typeof obj.delta === "string" && obj.delta.length > 0) {
          acc += obj.delta;
          handlers.onDelta?.(obj.delta, acc);
        }
      } catch (e) {
        if (e instanceof AiEngineError) throw e;
        /* ignore malformed SSE chunk */
      }
    }
  }

  const parsedJson = input.jsonMode ? safeParseJson<T>(acc) : null;
  return {
    model: input.model ?? "z-ai/glm-5.2",
    text: acc,
    json: parsedJson,
    usage: null,
  };
}

/**
 * React hook — supports both streaming and non-streaming.
 * When `stream: true`, `streamingText` updates live during generation.
 */
export function useAiEngine<T = unknown>() {
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AiEngineResponse<T> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const friendly = (e: unknown): string =>
    e instanceof AiEngineError
      ? e.status === 429
        ? "Prea multe cereri către AI. Reîncearcă în câteva secunde."
        : e.status === 402
          ? "Credite AI epuizate. Reîncarcă pentru a continua."
          : e.message
      : e instanceof Error
        ? e.message
        : "Eroare necunoscută la motorul AI";

  const run = useCallback(async (input: AiEngineRequest) => {
    setLoading(true);
    setError(null);
    setStreamingText("");

    try {
      if (input.stream) {
        setStreaming(true);
        abortRef.current?.abort();
        abortRef.current = new AbortController();
        const res = await streamAiEngine<T>(input, {
          signal: abortRef.current.signal,
          onDelta: (_d, acc) => setStreamingText(acc),
        });
        // If jsonMode, validate at the end — errors are captured as state, not thrown.
        if (input.jsonMode && res.json == null && res.text) {
          setError("Răspunsul AI nu este JSON valid. Se afișează textul brut.");
        }
        setData(res);
        return res;
      }

      const res = await callAiEngine<T>(input);
      setData(res);
      return res;
    } catch (e) {
      const msg = friendly(e);
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
    setLoading(false);
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setData(null);
    setStreamingText("");
  }, []);

  return { run, cancel, reset, loading, streaming, streamingText, error, data };
}
