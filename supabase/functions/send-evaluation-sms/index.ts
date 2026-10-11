// send-evaluation-sms — trimite un SMS clasic cu linkul de analiză gratuită
// către proprietarii al căror număr nu are WhatsApp (eroare Meta 131026).
//
// SMS-ul pleacă prin relay-ul Make.com existent (eveniment "evaluation_sms") —
// scenariul Make care livrează efectiv SMS-ul se configurează în Make.
// Dacă webhook-ul Make nu e configurat, funcția răspunde skipped, fără eroare.
//
// Protecții: doar admin, un singur SMS per prospect la 7 zile, număr RO valid.
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { relayToMake } from "../_shared/makeRelay.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-cron-secret",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function normalizeRo(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  if (/^\+40\d{9}$/.test(digits)) return digits;
  if (/^40\d{9}$/.test(digits)) return `+${digits}`;
  if (/^0\d{9}$/.test(digits)) return `+4${digits}`;
  if (/^7\d{8}$/.test(digits)) return `+40${digits}`;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const gate = await requireInternalOrAdmin(req, corsHeaders);
  if (gate) return gate;

  let body: { prospect_id?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const prospectId = String(body.prospect_id ?? "");
  if (!prospectId) return json({ error: "missing_prospect_id" }, 400);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: listing, error: lErr } = await admin
    .from("prospect_listings")
    .select("id, title, contact_phone, phone_normalized, source_url, zone")
    .eq("id", prospectId)
    .maybeSingle();
  if (lErr || !listing) return json({ error: "prospect_not_found" }, 404);

  const phone = normalizeRo(String(listing.phone_normalized || listing.contact_phone || ""));
  if (!phone) return json({ error: "invalid_phone" }, 400);
  if (!listing.source_url) return json({ error: "missing_source_url" }, 400);

  // Un singur SMS de evaluare per prospect la 7 zile.
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { count } = await admin
    .from("owner_outreach_messages")
    .select("*", { count: "exact", head: true })
    .eq("prospect_listing_id", prospectId)
    .eq("template_key", "evaluation_sms")
    .eq("status", "sent")
    .gte("created_at", since);
  if ((count ?? 0) > 0) {
    return json({ ok: false, skipped: "cooldown_7d" });
  }

  const analysisUrl = `https://realtrust.ro/analiza-anunt?url=${encodeURIComponent(listing.source_url)}`;
  const message =
    `Buna ziua! Am generat o evaluare gratuita pentru proprietatea dvo. ` +
    `Puteti vedea analiza de piata aici: ${analysisUrl} - Echipa RealTrust Timisoara`;

  const relay = await relayToMake("evaluation_sms", {
    to: phone,
    message,
    prospect_id: prospectId,
    analysis_url: analysisUrl,
  }, admin);

  const sent = relay.ok;
  await admin.from("owner_outreach_messages").insert({
    prospect_listing_id: prospectId,
    email: phone,
    message,
    channel: "sms",
    status: sent ? "sent" : relay.skipped === "not_configured" ? "skipped" : "failed",
    template_key: "evaluation_sms",
    sent_at: sent ? new Date().toISOString() : null,
    reminder_stage: 0,
  });

  if (relay.skipped === "not_configured") {
    return json({ ok: false, skipped: "not_configured", detail: "Webhook-ul Make pentru SMS nu e configurat." });
  }
  if (!sent) return json({ ok: false, error: relay.error || `HTTP ${relay.status}` }, 502);
  return json({ ok: true, to: phone });
});
