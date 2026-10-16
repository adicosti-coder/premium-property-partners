// reel-studio: admin-only. action=script → AI title (≤5 words) + caption for ApArt Hotel;
// action=send → POST {media_type:"REELS", sourceUrl, caption} to the existing Make.com webhook.
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { corsHeaders, json, errorResponse } from "../_shared/http.ts";
import { callAI, MODELS } from "../_shared/aiClient.ts";
import { formatSocialCaption } from "../_shared/socialCaption.ts";

const isMakeWebhook = (u: string) => {
  try { const x = new URL(u); return x.protocol === "https:" && /(^|\.)make\.com$/.test(x.hostname); } catch { return false; }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await requireAdmin(req, corsHeaders);
  if (!auth.ok) return auth.response!;
  try {
    const body = await req.json().catch(() => ({}));
    if (body.action === "script") {
      const context = String(body.context ?? "").slice(0, 1500);
      const { content } = await callAI({
        model: MODELS.text, fallbackModel: MODELS.fallback, label: "reel-studio",
        schema: { name: "reel_script", schema: {
          type: "object", additionalProperties: false, required: ["title", "caption"],
          properties: { title: { type: "string" }, caption: { type: "string" } },
        } },
        messages: [
          { role: "system", content: "Ești copywriter pentru ApArt Hotel Timișoara (apartamente în regim hotelier, Timișoara, jud. Timiș). Scrii în română. Titlu pentru ecran: maxim 5 cuvinte, fără emoji. Caption Instagram/Facebook: ton optimist și cald, 2-3 paragrafe scurte, fără linkuri, fără prețuri sau facilități inventate, fără promisiuni neconfirmate. Folosește doar informațiile primite." },
          { role: "user", content: `Detalii apartament (opțional): ${context || "ApArt Hotel Timișoara, cazare în regim hotelier"}` },
        ],
      });
      const title = String(content.title ?? "").split(/\s+/).filter(Boolean).slice(0, 5).join(" ");
      const caption = formatSocialCaption(String(content.caption ?? ""), { platform: "instagram", type: "property", hashtags: "#ApArtHotel #CazareTimisoara #Timișoara #RealTrust #VisitTimisoara" });
      return json({ title, caption });
    }
    if (body.action === "send") {
      const sourceUrl = String(body.sourceUrl ?? "");
      const caption = String(body.caption ?? "").trim();
      if (!/^https:\/\//.test(sourceUrl) || !caption || caption.length > 2200) return json({ error: "Video sau descriere invalidă." }, 400);
      const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: setting } = await sb.from("app_settings").select("value").eq("key", "webhook_url").maybeSingle();
      const webhook = (setting?.value as string | undefined)?.trim() ?? "";
      if (!isMakeWebhook(webhook)) return json({ error: "Webhook-ul Make.com nu este configurat în Social Engine." }, 400);
      const r = await fetch(webhook, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ media_type: "REELS", sourceUrl, caption }),
      });
      const text = (await r.text()).slice(0, 500);
      await sb.from("social_engine_logs").insert({
        post_id: null, post_title: "Reel Studio", platform: "instagram+facebook", trigger: "reel_studio",
        success: r.ok, http_status: r.status, response_body: text || null, error: r.ok ? null : `Make.com ${r.status}`, image_count: 0,
      });
      if (!r.ok) return json({ error: `Make.com a răspuns ${r.status}: ${text.slice(0, 200)}` }, 502);
      return json({ success: true });
    }
    return json({ error: "Acțiune necunoscută" }, 400);
  } catch (e) { return errorResponse(e, "reel-studio"); }
});
