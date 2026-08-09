import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export interface GLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GLMRequest {
  prompt?: string;
  context?: string | Record<string, unknown>;
  system?: string;
  temperature?: number;
  max_tokens?: number;
  messages?: GLMMessage[];
}

export interface GLMResponse {
  model: string;
  text: string;
  usage: unknown;
  raw: unknown;
}

/**
 * Call the `openrouter-glm` edge function (z-ai/glm-5.2 via OpenRouter).
 */
export async function callGLM(input: GLMRequest): Promise<GLMResponse> {
  const { data, error } = await supabase.functions.invoke<GLMResponse>(
    "openrouter-glm",
    { body: input },
  );
  if (error) throw error;
  if (!data) throw new Error("Empty response from openrouter-glm");
  return data;
}

/**
 * React hook wrapper with loading/error state.
 */
export function useOpenRouterGLM() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<GLMResponse | null>(null);

  const run = useCallback(async (input: GLMRequest) => {
    setLoading(true);
    setError(null);
    try {
      const res = await callGLM(input);
      setData(res);
      return res;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { run, loading, error, data };
}
