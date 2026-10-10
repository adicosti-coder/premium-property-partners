// listing-inspection-dispatch — la importul unui anunț nou: rescriere AI (rewrite-listing-for-web)
// + mesaj de inspecție pe WhatsApp-ul de administrare cu butoanele Aprob / Respinge.
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { ensureInspectionTemplate, isOutsideWindowError, missingCriticalFields, sendAdminWa, sendInspectionTemplate } from "../_shared/listingInspection.ts";
import { detectZone } from "../_shared/detectZone.ts";

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
  if (body?.ensure_template) return json({ template_status: await ensureInspectionTemplate() });
  const prospectId = String(body?.prospect_id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(prospectId)) return json({ error: "prospect_id invalid" }, 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const SELECT = "id, title, description, zone, price, rooms, size, category, source_url, contact_phone, phone_normalized";
  let { data: p } = await supabase.from("prospect_listings").select(SELECT).eq("id", prospectId).maybeSingle();
  if (!p) return json({ error: "not found" }, 404);

  const { data: existing } = await supabase.from("listing_inspections")
    .select("id, sent_at").eq("prospect_listing_id", p.id).maybeSingle();
  if (existing?.sent_at) return json({ skipped: "already_sent" });

  // 0) Telefon obligatoriu: Andrei trebuie să poată cere acordul pe WhatsApp (mobil RO).
  const mobile = (raw?: string | null) => {
    let d = String(raw ?? "").replace(/\D/g, "");
    if (d.startsWith("0040")) d = d.slice(2);
    if (d.startsWith("40")) d = d.slice(2); else if (d.startsWith("0")) d = d.slice(1);
    return /^7\d{8}$/.test(d) ? `+40${d}` : null;
  };
  let phone = mobile(p.phone_normalized) || mobile(p.contact_phone);
  if (!phone && p.source_url) {
    // Simulează „Arată telefonul” pe pagina originală (OLX/Storia/etc.).
    await fetch(`${supabaseUrl}/functions/v1/prospect-recover-phone`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-webhook-secret": serviceKey },
      body: JSON.stringify({ prospect_id: p.id }),
    }).then((r) => r.text()).catch(() => null);
    const again = await supabase.from("prospect_listings").select(SELECT).eq("id", p.id).maybeSingle();
    if (again.data) p = again.data;
    phone = mobile(p.phone_normalized) || mobile(p.contact_phone);
  }
  if (!phone) {
    await supabase.from("listing_inspections").upsert({
      prospect_listing_id: p.id, status: "no_phone",
      error: "Fără telefon mobil extras — prospectare manuală", sent_at: null,
    }, { onConflict: "prospect_listing_id" });
    return json({ skipped: "no_phone" });
  }

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

  if (!clean.neighborhood && !p.zone) {
    const z = detectZone(p.title, clean.clean_title, p.description, clean.clean_description);
    if (z) {
      clean.neighborhood = z;
      await supabase.from("prospect_listings").update({ zone: z }).eq("id", p.id);
    }
  }
  const missing = missingCriticalFields({ price: clean.price, neighborhood: clean.neighborhood || p.zone });
  const { data: insp, error: iErr } = await supabase.from("listing_inspections").upsert({
    prospect_listing_id: p.id,
    status: "pending",
    clean_title: clean.clean_title,
    clean_description: clean.clean_description,
    neighborhood: clean.neighborhood,
    property_type: clean.property_type,
    price: clean.price,
    error: null,
    decision_note: missing.length ? `missing:${missing.join(",")}` : null,
  }, { onConflict: "prospect_listing_id" }).select("id").single();
  if (iErr || !insp) return json({ error: iErr?.message ?? "save failed" }, 500);

  // 2) Mesaj de inspecție cu butoane (fereastra Meta de 24h trebuie să fie deschisă pe numărul admin).
  const preview = String(clean.clean_description || "")
    .replace(/^###.*$/gm, "").replace(/[*_#>`]/g, "").replace(/\s+/g, " ").trim().slice(0, 300);
  const isRent = String(p.category || "").toLowerCase() === "inchiriere";
  const priceTxt = clean.price ? `${Number(clean.price).toLocaleString("ro-RO")} €${isRent ? "/lună" : ""}` : "—";
  const warn = missing.length
    ? `⚠️ LIPSEȘTE: ${missing.join(" și ")}. Răspundeți la mesaj cu valoarea + decizia, ex. ${missing.includes("preț") ? "„75000 1”" : "„Iosefin 1”"}.`
    : "";
  const bodyText = [
    isRent ? "🔎 Anunț nou de inspectat · ÎNCHIRIERE" : "🔎 Anunț nou de inspectat · VÂNZARE",
    `*${clean.clean_title}*`,
    `💶 ${priceTxt} · 📍 ${clean.neighborhood || p.zone || "—"}`,
    warn,
    "",
    preview ? `${preview}…` : "",
    "",
    "Răspundeți 1 / Aprob pentru publicare sau 2 / Respinge pentru arhivare.",
  ].join("\n").slice(0, 1020);

  let sent = await sendAdminWa({
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

  // În afara ferestrei de 24h: Meta permite doar șabloane aprobate → trimitem șablonul de inspecție.
  if (!sent.ok && isOutsideWindowError(sent.error)) {
    const t = await sendInspectionTemplate(insp.id, {
      kind: isRent ? "Închiriere" : "Vânzare",
      title: clean.clean_title,
      price: priceTxt,
      zone: clean.neighborhood || p.zone || "—",
      note: missing.length ? `lipsește ${missing.join(" și ")}, răspundeți cu valoarea și decizia` : "date complete",
    });
    sent = t.ok ? t : { ok: false, error: `${sent.error} | ${t.error}` };
  }

  await supabase.from("listing_inspections").update(
    sent.ok
      ? { wa_message_id: sent.id ?? null, sent_at: new Date().toISOString() }
      : { error: `wa_send: ${sent.error}`.slice(0, 400) },
  ).eq("id", insp.id);

  // 3) Bot acord: cerem imediat acordul proprietarului (are mobil valid); la „DA” se publică automat.
  let consent: unknown = null;
  try {
    const { data: cronSecret } = await supabase.rpc("get_cron_reconcile_secret");
    const cr = await fetch(`${supabaseUrl}/functions/v1/wa-request-publish-consent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-cron-secret": String(cronSecret || "") },
      body: JSON.stringify({ prospect_ids: [p.id] }),
    });
    consent = (await cr.json().catch(() => ({})))?.results?.[0]?.status ?? cr.status;
  } catch (e) { consent = String(e); }

  return json({ ok: sent.ok, inspection_id: insp.id, consent, wa_error: sent.ok ? undefined : sent.error });
});
