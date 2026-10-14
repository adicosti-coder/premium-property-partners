// ai-vision: ANALYZE (one structured call: title, description, rooms, score, alt texts) | ENHANCE (image edit).
import { requireAdmin } from "../_shared/adminAuth.ts";
import { corsHeaders, json, errorResponse } from "../_shared/http.ts";
import { analyzeImages, enhanceImage } from "../_shared/aiVision.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await requireAdmin(req, corsHeaders);
  if (!auth.ok) return auth.response!;
  try {
    const b = await req.json().catch(() => ({}));
    const action = String(b.action || "ANALYZE").toUpperCase();
    if (action === "ANALYZE") return json(await analyzeImages(b.imageUrls, b.language));
    if (action === "ENHANCE") return json(await enhanceImage(b.imageUrl, b.mode, b.style));
    return json({ error: "Invalid action" }, 400);
  } catch (e) { return errorResponse(e, "ai-vision"); }
});
