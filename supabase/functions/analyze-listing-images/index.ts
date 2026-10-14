// Legacy URL kept for existing callers; logic lives in _shared/aiVision.ts (same as ai-vision ANALYZE).
import { requireAdmin } from "../_shared/adminAuth.ts";
import { corsHeaders, json, errorResponse } from "../_shared/http.ts";
import { analyzeImages } from "../_shared/aiVision.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await requireAdmin(req, corsHeaders);
  if (!auth.ok) return auth.response!;
  try {
    const { imageUrls, language } = await req.json();
    return json(await analyzeImages(imageUrls, language));
  } catch (e) { return errorResponse(e, "analyze-listing-images"); }
});
