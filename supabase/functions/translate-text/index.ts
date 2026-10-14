// Legacy URL kept for existing callers; logic lives in _shared/aiText.ts (ai-text-generation TRANSLATE).
import { getCorsHeaders } from "../_shared/securityHeaders.ts";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { runTextAction } from "../_shared/aiText.ts";
import { AIError } from "../_shared/aiClient.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await requireAdmin(req, corsHeaders);
  if (!auth.ok) return auth.response!;
  const h = { ...corsHeaders, "Content-Type": "application/json" };
  try {
    const { text, sourceLang, targetLang } = await req.json();
    const r = await runTextAction({ action: "TRANSLATE", text, sourceLang, targetLang });
    return new Response(JSON.stringify({ translated: String(r.result ?? ""), cached: r.cached }), { headers: h });
  } catch (e) {
    const status = e instanceof AIError ? e.status : 500;
    if (!(e instanceof AIError)) console.error("[Translate]", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Translation failed" }), { status, headers: h });
  }
});
