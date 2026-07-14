import { useCallback, useRef, useState } from "react";
import { z, type ZodType } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { supabaseConfig, getSupabasePublishableKey } from "@/lib/supabaseClient";

export type AiEngineModel =
  | "z-ai/glm-5.2"
  | "google/gemini-3.1-pro-preview"
  | "google/gemini-3.1-flash-lite-preview";

export interface AiEngineRequest<T = unknown> {
  prompt: string;
  systemPrompt?: string;
  model?: AiEngineModel;
  jsonMode?: boolean;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  /** Optional Zod schema — enforced when jsonMode is true. */
  schema?: ZodType<T>;
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

// ---------- Utilities ----------

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
    const m = cleaned.match(/\{[\s\S]*\}$/);
    if (m) {
      try { return JSON.parse(m[0]) as T; } catch { /* noop */ }
    }
    return null;
  }
}

/** Validate parsed JSON against a Zod schema; throws AiEngineError on mismatch. */
function validateWithSchema<T>(raw: unknown, schema: ZodType<T>): T {
  const res = schema.safeParse(raw);
  if (!res.success) {
    throw new AiEngineError(
      "Răspunsul AI nu respectă schema așteptată.",
      422,
      res.error.flatten(),
    );
  }
  return res.data;
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const t = setTimeout(() => resolve(), ms);
    signal?.addEventListener(
      "abort",
      () => { clearTimeout(t); reject(new DOMException("Aborted", "AbortError")); },
      { once: true },
    );
  });

/** Exponential backoff with jitter for 429 retries. */
async function withRetry429<R>(
  fn: (attempt: number) => Promise<R>,
  opts: { maxAttempts?: number; signal?: AbortSignal } = {},
): Promise<R> {
  const maxAttempts = opts.maxAttempts ?? 3;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (e) {
      lastErr = e;
      const status = e instanceof AiEngineError ? e.status : undefined;
      if (status !== 429 || attempt === maxAttempts) throw e;
      const base = 500 * Math.pow(2, attempt - 1); // 500, 1000, 2000
      const delay = base + Math.floor(Math.random() * 250);
      await sleep(delay, opts.signal);
    }
  }
  throw lastErr;
}

// ---------- Non-streaming ----------

async function invokeOnce<T = unknown>(input: AiEngineRequest<T>): Promise<AiEngineResponse<T>> {
  const { data, error } = await supabase.functions.invoke<
    AiEngineResponse<T> & { error?: string; details?: unknown }
  >("openrouter-ai", { body: { ...input, schema: undefined, stream: false } });

  if (error) {
    const status = (error as any).status ?? (error as any).context?.status;
    throw new AiEngineError(error.message || "Eroare la apelarea motorului AI", status, error);
  }
  if (!data) throw new AiEngineError("Răspuns gol de la motorul AI");
  if ((data as any).error) {
    const details = (data as any).details;
    const msg = String((data as any).error);
    const status = /\b429\b/.test(msg) ? 429 : /\b402\b/.test(msg) ? 402 : undefined;
    throw new AiEngineError(msg, status, details);
  }
  return data;
}

export async function callAiEngine<T = unknown>(
  input: AiEngineRequest<T>,
  opts: { signal?: AbortSignal; maxRetries?: number } = {},
): Promise<AiEngineResponse<T>> {
  const res = await withRetry429(() => invokeOnce<T>(input), {
    maxAttempts: opts.maxRetries ?? 3,
    signal: opts.signal,
  });

  if (input.jsonMode && input.schema) {
    const parsed = res.json ?? safeParseJson(res.text);
    const validated = validateWithSchema(parsed, input.schema);
    return { ...res, json: validated };
  }
  return res;
}

// ---------- Streaming ----------

async function streamOnce<T = unknown>(
  input: AiEngineRequest<T>,
  handlers: {
    onDelta?: (delta: string, accumulated: string) => void;
    signal?: AbortSignal;
  },
): Promise<AiEngineResponse<T>> {
  const apiKey = getSupabasePublishableKey();

  const getAccessToken = async (forceRefresh = false): Promise<string | null> => {
    if (forceRefresh) {
      const { data } = await supabase.auth.refreshSession();
      return data?.session?.access_token ?? null;
    }
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token ?? null;
  };

  let accessToken = await getAccessToken(false);
  if (!accessToken) {
    // No cached session — try a refresh in case the client just booted.
    accessToken = await getAccessToken(true);
  }
  if (!accessToken) {
    throw new AiEngineError("Trebuie să fii autentificat ca admin pentru a folosi motorul AI.", 401);
  }

  const doFetch = (token: string) =>
    fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: apiKey,
      },
      body: JSON.stringify({ ...input, schema: undefined, stream: true }),
      signal: handlers.signal,
    });

  let res = await doFetch(accessToken);

  // If auth failed, try refreshing the session once and retry.
  if (res.status === 401) {
    const refreshed = await getAccessToken(true);
    if (refreshed && refreshed !== accessToken) {
      accessToken = refreshed;
      res = await doFetch(accessToken);
    }
  }

  if (!res.ok || !res.body) {
    let details: any = null;
    try { details = await res.json(); } catch { /* noop */ }
    const detailMsg = details?.error ? ` — ${details.error}` : "";
    throw new AiEngineError(`Motorul AI a răspuns cu ${res.status}${detailMsg}`, res.status, details);
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
        if (obj.error) {
          const msg = String(obj.error);
          const status = /\b429\b/.test(msg) ? 429 : /\b402\b/.test(msg) ? 402 : undefined;
          throw new AiEngineError(msg, status);
        }
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

  return { model: input.model ?? "z-ai/glm-5.2", text: acc, json: null, usage: null };
}

export async function streamAiEngine<T = unknown>(
  input: AiEngineRequest<T>,
  handlers: {
    onDelta?: (delta: string, accumulated: string) => void;
    signal?: AbortSignal;
    maxRetries?: number;
  } = {},
): Promise<AiEngineResponse<T>> {
  const res = await withRetry429(
    () => streamOnce<T>(input, { onDelta: handlers.onDelta, signal: handlers.signal }),
    { maxAttempts: handlers.maxRetries ?? 3, signal: handlers.signal },
  );

  if (input.jsonMode) {
    const parsed = safeParseJson(res.text);
    if (input.schema) {
      const validated = validateWithSchema(parsed, input.schema);
      return { ...res, json: validated };
    }
    return { ...res, json: parsed as T | null };
  }
  return res;
}

// ---------- React hook ----------

/** UI throttle interval for streaming re-renders (ms). */
const STREAM_UI_THROTTLE_MS = 80;

export function useAiEngine<T = unknown>() {
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AiEngineResponse<T> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Throttling refs for streaming UI updates
  const lastFlushRef = useRef(0);
  const pendingRef = useRef<string>("");
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushStreaming = useCallback(() => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    lastFlushRef.current = Date.now();
    setStreamingText(pendingRef.current);
  }, []);

  const scheduleFlush = useCallback((acc: string) => {
    pendingRef.current = acc;
    const now = Date.now();
    const elapsed = now - lastFlushRef.current;
    if (elapsed >= STREAM_UI_THROTTLE_MS) {
      flushStreaming();
    } else if (!flushTimerRef.current) {
      flushTimerRef.current = setTimeout(flushStreaming, STREAM_UI_THROTTLE_MS - elapsed);
    }
  }, [flushStreaming]);

  const friendly = (e: unknown): string =>
    e instanceof AiEngineError
      ? e.status === 429
        ? "Prea multe cereri către AI. Reîncearcă în câteva secunde."
        : e.status === 402
          ? "Credite AI epuizate. Reîncarcă pentru a continua."
          : e.status === 422
            ? e.message
            : e.message
      : e instanceof Error
        ? e.message
        : "Eroare necunoscută la motorul AI";

  const run = useCallback(async (input: AiEngineRequest<T>) => {
    setLoading(true);
    setError(null);
    setStreamingText("");
    pendingRef.current = "";
    lastFlushRef.current = 0;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      if (input.stream) {
        setStreaming(true);
        const res = await streamAiEngine<T>(input, {
          signal: abortRef.current.signal,
          onDelta: (_d, acc) => scheduleFlush(acc),
        });
        flushStreaming();
        setData(res);
        return res;
      }

      const res = await callAiEngine<T>(input, { signal: abortRef.current.signal });
      setData(res);
      return res;
    } catch (e) {
      setError(friendly(e));
      throw e;
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  }, [flushStreaming, scheduleFlush]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    setStreaming(false);
    setLoading(false);
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setData(null);
    setStreamingText("");
    pendingRef.current = "";
  }, []);

  return { run, cancel, reset, loading, streaming, streamingText, error, data };
}

// Re-export zod for consumers that want to build schemas inline.
export { z };
