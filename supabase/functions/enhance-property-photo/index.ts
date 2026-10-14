// Legacy URL kept for existing callers; logic lives in _shared/aiVision.ts (same as ai-vision ENHANCE).
import { requireAdmin } from "../_shared/adminAuth.ts";
import { corsHeaders, json, errorResponse } from "../_shared/http.ts";
import { enhanceImage } from "../_shared/aiVision.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await requireAdmin(req, corsHeaders);
  if (!auth.ok) return auth.response!;
  try {
    const { imageUrl, mode = "enhance", style = "modern" } = await req.json();
    return json(await enhanceImage(imageUrl, mode, style));
  } catch (e) { return errorResponse(e, "enhance-property-photo"); }
});
