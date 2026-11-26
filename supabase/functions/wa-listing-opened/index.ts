// wa-listing-opened — endpoint public (site) pentru pasul de tranzacție:
// clientul a ales un apartament din secțiunea de contact și a deschis discuția
// WhatsApp cu anunțul. Înregistrăm evenimentul pentru dashboardul de tranzacții
// și îl anunțăm în Make. Fără date sensibile: doar apartamentul (+ telefon opțional).
import { createClient } from "npm:@supabase/supabase-js@2";
import { relayToMake } from "../_shared/makeRelay.ts";
import { checkRateLimit, getClientIp } from "../_shared/rateLimiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function normalizeRoMobile(raw: string): string | null {
  let d = (raw || "").replace(/[^\d]/g, "");
  if (d.startsWith("0040")) d = d.slice(4);
  else if (d.startsWith("40")) d = d.slice(2);
  else if (d.startsWith("0")) d = d.slice(1);
  if (!/^7\d{8}$/.test(d)) return null;
  return `+40${d}`;
}

const recentOpens = new Map<string, number>();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Anti-abuz: max 30 de evenimente/minut/IP — endpointul e public.
  const rl = checkRateLimit(`wa-open:${getClientIp(req)}`, { maxRequests: 30, windowMs: 60_000 });
  if (!rl.allowed) return json({ error: "rate_limit" }, 429);

  let body: { property_id?: string; phone?: string } = {};
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const propertyId = (body.property_id || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(propertyId)) return json({ error: "property_id_invalid" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: prop } = await supabase
    .from("properties")
    .select("id, name, slug")
    .eq("id", propertyId)
    .eq("is_active", true)
    .maybeSingle();
  if (!prop) return json({ error: "property_not_found" }, 404);

  const phone = normalizeRoMobile(body.phone || "") || "";
  const url = prop.slug ? `https://realtrust.ro/proprietate/${prop.slug}` : null;

  // Deduplicare locală (memorie, 1h): fără interogări în istoricul evenimentelor
  // pe baza datelor trimise de apelant.
  if (phone) {
    const key = `${phone}:${prop.id}`;
    const now = Date.now();
    for (const [k, t] of recentOpens) if (now - t > 3_600_000) recentOpens.delete(k);
    if (recentOpens.has(key)) return json({ ok: true });
    recentOpens.set(key, now);
  }

  const { error } = await supabase.from("wa_transaction_events").insert({
    phone_normalized: phone,
    property_id: prop.id,
    property_name: prop.name,
    property_slug: prop.slug,
    property_url: url,
    event: "listing_opened",
    status: "opened",
    source: "site",
  });
  if (error) {
    console.error("wa-listing-opened insert failed", error.code);
    return json({ ok: true });
  }

  await relayToMake("wa_listing_opened", {
    phone,
    property_id: prop.id,
    property_name: prop.name,
    property_url: url,
    source: "site",
  });

  return json({ ok: true });
});
