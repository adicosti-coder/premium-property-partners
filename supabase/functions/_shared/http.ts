// Shared HTTP helpers: CORS, JSON responses and uniform error mapping.
import { AIError } from "./aiClient.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

export function errorResponse(e: unknown, label: string): Response {
  if (e instanceof AIError) return json({ error: e.message }, e.status);
  console.error(`[${label}]`, e);
  return json({ error: e instanceof Error ? e.message : String(e) }, 500);
}
