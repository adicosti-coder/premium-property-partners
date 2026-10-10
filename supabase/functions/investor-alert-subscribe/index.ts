// investor-alert-subscribe — public opt-in for „Oportunități sub prețul pieței”.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rateLimiter.ts";
import { canonicalWaPhone } from "../_shared/waPhone.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const ZONES = ["Centru / Cetate", "Elisabetin", "Iosefin", "Fabric", "Nord / Aradului", "Dumbrăvița", "Sud", "Periurban"];
export const CONSENT_TEXT = "Accept să primesc pe WhatsApp alerte RealTrust cu apartamente sub prețul pieței. Mă pot dezabona oricând răspunzând STOP.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (!checkRateLimit(`investor-sub:${ip}`, { maxRequests: 5, windowMs: 3600_000 }).allowed) return json({ error: "rate_limited", message: "Prea multe încercări. Reîncearcă peste o oră." }, 429);

  const b = await req.json().catch(() => ({}));
  const phone = canonicalWaPhone(String(b?.phone || "").slice(0, 30));
  if (!phone || !/^\+407\d{8}$/.test(phone)) return json({ error: "invalid_phone", message: "Introdu un număr de mobil românesc (07…)." }, 400);
  if (b?.consent !== true) return json({ error: "consent_required", message: "Bifează acordul pentru alerte pe WhatsApp." }, 400);
  const zones = Array.isArray(b?.zones) ? b.zones.filter((z: unknown) => typeof z === "string" && ZONES.includes(z)).slice(0, 8) : [];
  const maxPrice = Number(b?.max_price) > 10000 && Number(b?.max_price) < 3_000_000 ? Math.round(Number(b.max_price)) : null;
  const name = typeof b?.name === "string" ? b.name.trim().slice(0, 80) || null : null;

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  // Link to the signed-in investor account (for /investitori), when present.
  const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: u } = jwt ? await sb.auth.getUser(jwt) : { data: null };
  const { error } = await sb.from("investor_alert_subscribers").upsert({
    phone_normalized: phone, name, zones, max_price: maxPrice, consent_text: CONSENT_TEXT,
    consented_at: new Date().toISOString(), unsubscribed_at: null,
    ...(u?.user?.id ? { user_id: u.user.id } : {}),
  }, { onConflict: "phone_normalized" });
  if (error) return json({ error: "db_error" }, 500);
  return json({ ok: true });
});
