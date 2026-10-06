// listing-inspection-dispatch — la importul unui anunț nou: rescriere AI (rewrite-listing-for-web)
// + mesaj de inspecție pe WhatsApp-ul de administrare cu butoanele Aprob / Respinge.
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { sendAdminWa } from "../_shared/listingInspection.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const denied = await requireInternalOrAdmin(req, corsHeaders);
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const prospectId = String(body?.prospect_id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(prospectId)) return json({ error: "prospect_id invalid" }, 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: p } = await supabase.from("prospect_listings")
    .select("id, title, description, zone, price, rooms, size, category, source_url")
    .eq("id", prospectId).maybeSingle();
  if (!p) return json({ error: "not found" }, 404);

  const { data: existing } = await supabase.from("listing_inspections")
    .select("id, sent_at").eq("prospect_listing_id", p.id).maybeSingle();
  if (existing?.sent_at) return json({ skipped: "already_sent" });

  // 1) Curățare + rescriere AI (apel intern; secretul de cron vine din trigger).
  const rw = await fetch(`${supabaseUrl}/functions/v1/rewrite-listing-for-web`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-webhook-secret": serviceKey },
    body: JSON.stringify({
      title: p.title, description: p.description, zone: p.zone, price: p.price,
      rooms: p.rooms, surface: p.size, listing_type: p.category,
    }),
    signal: req.signal,
  });
  const clean = await rw.json().catch(() => ({}));
  if (!rw.ok || !clean?.clean_title) {
    await supabase.from("listing_inspections").upsert({
      prospect_listing_id: p.id, status: "pending", error: `rewrite ${rw.status}: ${clean?.error ?? ""}`.slice(0, 400),
    }, { onConflict: "prospect_listing_id" });
    return json({ error: "rewrite_failed", status: rw.status }, 502);
  }

  const { data: insp, error: iErr } = await supabase.from("listing_inspections").upsert({
    prospect_listing_id: p.id,
    status: "pending",
    clean_title: clean.clean_title,
    clean_description: clean.clean_description,
    neighborhood: clean.neighborhood,
    property_type: clean.property_type,
    price: clean.price,
    error: null,
  }, { onConflict: "prospect_listing_id" }).select("id").single();
  if (iErr || !insp) return json({ error: iErr?.message ?? "save failed" }, 500);

  // 2) Mesaj de inspecție cu butoane (fereastra Meta de 24h trebuie să fie deschisă pe numărul admin).
  const preview = String(clean.clean_description || "")
    .replace(/^###.*$/gm, "").replace(/[*_#>`]/g, "").replace(/\s+/g, " ").trim().slice(0, 300);
  const priceTxt = clean.price ? `${Number(clean.price).toLocaleString("ro-RO")} €` : "—";
  const bodyText = [
    "🔎 Anunț nou de inspectat",
    `*${clean.clean_title}*`,
    `💶 ${priceTxt} · 📍 ${clean.neighborhood || p.zone || "—"}`,
    "",
    preview ? `${preview}…` : "",
    "",
    "Răspundeți 1 / Aprob pentru publicare sau 2 / Respinge pentru arhivare.",
  ].join("\n").slice(0, 1020);

  const sent = await sendAdminWa({
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText },
      action: {
        buttons: [
          { type: "reply", reply: { id: `insp_ok:${insp.id}`, title: "1 · Aprob" } },
          { type: "reply", reply: { id: `insp_no:${insp.id}`, title: "2 · Respinge" } },
        ],
      },
    },
  });

  await supabase.from("listing_inspections").update(
    sent.ok
      ? { wa_message_id: sent.id ?? null, sent_at: new Date().toISOString() }
      : { error: `wa_send: ${sent.error}`.slice(0, 400) },
  ).eq("id", insp.id);

  return json({ ok: sent.ok, inspection_id: insp.id, wa_error: sent.ok ? undefined : sent.error });
});
