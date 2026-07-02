import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AiEngineModel =
  | "z-ai/glm-5.2"
  | "google/gemini-3.1-pro-preview"
  | "google/gemini-3.1-flash-lite-preview";

export interface AiEngineRequest {
  prompt: string;
  systemPrompt?: string;
  model?: AiEngineModel;
  jsonMode?: boolean;
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

/**
 * Call the `openrouter-ai` edge function.
 */
export async function callAiEngine<T = unknown>(
  input: AiEngineRequest,
): Promise<AiEngineResponse<T>> {
  const { data, error } = await supabase.functions.invoke<AiEngineResponse<T> & { error?: string; details?: unknown }>(
    "openrouter-ai",
    { body: input },
  );

  if (error) {
    throw new AiEngineError(
      error.message || "Eroare la apelarea motorului AI",
      (error as any).status,
      error,
    );
  }
  if (!data) {
    throw new AiEngineError("Răspuns gol de la motorul AI");
  }
  if ((data as any).error) {
    throw new AiEngineError(String((data as any).error), undefined, (data as any).details);
  }
  return data;
}

/**
 * React hook with loading/error state and friendly error messages.
 */
export function useAiEngine<T = unknown>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AiEngineResponse<T> | null>(null);

  const run = useCallback(async (input: AiEngineRequest) => {
    setLoading(true);
    setError(null);
    try {
      const res = await callAiEngine<T>(input);
      setData(res);
      return res;
    } catch (e) {
      const msg =
        e instanceof AiEngineError
          ? e.status === 429
            ? "Prea multe cereri către AI. Reîncearcă în câteva secunde."
            : e.status === 402
              ? "Credite AI epuizate. Reîncarcă pentru a continua."
              : e.message
          : e instanceof Error
            ? e.message
            : "Eroare necunoscută la motorul AI";
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setData(null);
  }, []);

  return { run, reset, loading, error, data };
}
