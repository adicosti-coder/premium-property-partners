// ai-text-generation: TRANSLATE | SEO_OPTIMIZE | GENERATE_DESCRIPTION | EXTRACT_AMENITIES, cached by sha256.
import { requireAdmin } from "../_shared/adminAuth.ts";
import { corsHeaders, json, errorResponse } from "../_shared/http.ts";
import { runTextAction } from "../_shared/aiText.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await requireAdmin(req, corsHeaders);
  if (!auth.ok) return auth.response!;
  try { return json(await runTextAction(await req.json().catch(() => ({})))); }
  catch (e) { return errorResponse(e, "ai-text-generation"); }
});
