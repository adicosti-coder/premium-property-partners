// Inspecția anunțurilor noi pe WhatsApp-ul de administrare: „1/Aprob” publică, „2/Respinge” arhivează.
// Publicarea respectă în continuare acordul proprietarului („DA PUBLIC”).
import { WA_PHONE_NUMBER_ID, waToken } from "./waConfig.ts";

export const ADMIN_INSPECTION_NUMBER = "40723154520";
export const ADMIN_INSPECTION_PHONE = `+${ADMIN_INSPECTION_NUMBER}`;

export async function sendAdminWa(payload: Record<string, unknown>): Promise<{ ok: boolean; id?: string; error?: string }> {
  const token = waToken();
  if (!token) return { ok: false, error: "missing_wa_token" };
  const r = await fetch(`https://graph.facebook.com/v20.0/${WA_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: ADMIN_INSPECTION_NUMBER, ...payload }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, error: JSON.stringify(j).slice(0, 400) };
  return { ok: true, id: j?.messages?.[0]?.id };
}

export const sendAdminText = (body: string) =>
  sendAdminWa({ type: "text", text: { preview_url: false, body: body.slice(0, 4000) } });

/** Mesaj text simplu către orice număr (ex. proprietarul), din numărul oficial de companie. */
export async function sendWaText(to: string, body: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  const token = waToken();
  const digits = String(to || "").replace(/\D/g, "");
  if (!token || !digits) return { ok: false, error: !token ? "missing_wa_token" : "missing_phone" };
  const r = await fetch(`https://graph.facebook.com/v20.0/${WA_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: digits, type: "text", text: { preview_url: true, body: body.slice(0, 4000) } }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, error: JSON.stringify(j).slice(0, 400) };
  return { ok: true, id: j?.messages?.[0]?.id };
}

export const OWNER_WAITING_ADMIN_TEXT =
  "Mulțumim! Anunțul dumneavoastră a fost trimis către echipa de verificare RealTrust și va fi vizibil pe site în cel mai scurt timp. Revenim cu link-ul direct!";
export const ownerPublishedText = (slug: string) =>
  `Anunțul dumneavoastră este acum publicat pe realtrust.ro: https://realtrust.ro/proprietate/${slug}\nPuteți retrage acordul oricând scriind RETRAG.`;

/** Câmpurile critice care lipsesc din anunțul curățat. */
export function missingCriticalFields(x: { price?: unknown; neighborhood?: unknown }): string[] {
  const out: string[] = [];
  if (!(Number(x.price) > 0)) out.push("preț");
  if (!String(x.neighborhood ?? "").trim()) out.push("zonă");
  return out;
}

type Decision = { action: "approve" | "reject"; inspectionId: string | null; price?: number; zone?: string };

function parsePriceValue(v: string): number | null {
  const m = v.replace(/€|eur(o)?/gi, "").trim().match(/^(\d{1,3}(?:[ .,]\d{3})+|\d+)(?:\s*(k|mii))?$/i);
  if (!m) return null;
  let n = Number(m[1].replace(/[ .,]/g, ""));
  if (m[2]) n *= 1000;
  return n > 0 ? n : null;
}

/** Recunoaște răspunsul adminului la un mesaj de inspecție. */
export function parseInspectionReply(msg: any, text: string): Decision | null {
  const btn = String(msg?.interactive?.button_reply?.id || "");
  const m = btn.match(/^insp_(ok|no):([0-9a-f-]{36})$/i);
  if (m) return { action: m[1] === "ok" ? "approve" : "reject", inspectionId: m[2] };
  const t = text.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.!]+$/, "");
  const quoted = !!msg?.context?.id;
  if (t === "aprob" || (quoted && t === "1")) return { action: "approve", inspectionId: null };
  if (t === "respinge" || t === "resping" || (quoted && t === "2")) return { action: "reject", inspectionId: null };
  // Valoare lipsă + decizie, ex. „75000 1”, „75.000 aprob”, „Iosefin 1” (zona doar ca răspuns la mesaj).
  const vm = text.trim().match(/^(.+?)\s+(1|2|aprob|respinge|resping)[.!]*$/i);
  if (vm) {
    const action = /^(1|aprob)$/i.test(vm[2]) ? "approve" : "reject";
    const price = parsePriceValue(vm[1]);
    if (price) return { action, inspectionId: null, price };
    const zone = vm[1].trim();
    if (quoted && zone.length >= 3 && zone.length <= 40 && !/\d{4,}/.test(zone)) {
      return { action, inspectionId: null, zone: zone.charAt(0).toUpperCase() + zone.slice(1) };
    }
  }
  return null;
}

export async function handleInspectionDecision(
  supabase: any,
  msg: any,
  decision: Decision,
  env: { supabaseUrl: string; serviceKey: string },
): Promise<void> {
  let q = supabase.from("listing_inspections")
    .select("id, prospect_listing_id, status, clean_title, clean_description").limit(1);
  if (decision.inspectionId) q = q.eq("id", decision.inspectionId);
  else if (msg?.context?.id) q = q.eq("wa_message_id", msg.context.id);
  else q = q.eq("status", "pending").order("sent_at", { ascending: false });
  const { data: insp } = await q.maybeSingle();
  if (!insp) {
    await sendAdminText("Nu am găsit anunțul de inspecție. Răspundeți direct la mesajul anunțului.");
    return;
  }
  if (insp.status !== "pending") {
    await sendAdminText(`Anunțul „${insp.clean_title}” a fost deja ${insp.status === "rejected" ? "respins" : "aprobat"}.`);
    return;
  }
  const now = new Date().toISOString();

  // Completăm valoarea lipsă trimisă de admin împreună cu decizia.
  if (decision.price || decision.zone) {
    const iu: Record<string, unknown> = {};
    const pu: Record<string, unknown> = {};
    if (decision.price) { iu.price = decision.price; pu.price = decision.price; }
    if (decision.zone) { iu.neighborhood = decision.zone; pu.zone = decision.zone; }
    await supabase.from("listing_inspections").update(iu).eq("id", insp.id);
    await supabase.from("prospect_listings").update(pu).eq("id", insp.prospect_listing_id);
    await sendAdminText(decision.price
      ? `✏️ Preț setat: ${decision.price.toLocaleString("ro-RO")} €`
      : `✏️ Zonă setată: ${decision.zone}`);
  }

  if (decision.action === "reject") {
    await supabase.from("prospect_listings").update({ status: "archived" }).eq("id", insp.prospect_listing_id);
    await supabase.from("listing_inspections").update({ status: "rejected", decided_at: now }).eq("id", insp.id);
    await sendAdminText(`🗄️ Arhivat: ${insp.clean_title}`);
    return;
  }

  await supabase.from("listing_inspections").update({ status: "approved", decided_at: now }).eq("id", insp.id);
  const resp = await fetch(`${env.supabaseUrl}/functions/v1/auto-publish-listing-worker`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.serviceKey}`, "x-cron-secret": env.serviceKey },
    body: JSON.stringify({
      prospect_id: insp.prospect_listing_id,
      triggered_by: "wa_admin_inspection",
      clean_title: insp.clean_title,
      clean_description: insp.clean_description,
    }),
  }).catch(() => null);
  const r = resp ? await resp.json().catch(() => ({})) : {};

  if (r?.published) {
    await supabase.from("listing_inspections").update({ status: "published", decision_note: r.property_id }).eq("id", insp.id);
    await sendAdminText(`✅ Publicat pe realtrust.ro: ${insp.clean_title}\nhttps://realtrust.ro/proprietate/${r.slug ?? ""}`);
  } else if (r?.reason === "owner_consent_required") {
    await supabase.from("listing_inspections").update({ status: "approved_waiting_consent" }).eq("id", insp.id);
    await sendAdminText(
      `👍 Aprobat: ${insp.clean_title}\nSe publică automat imediat ce proprietarul răspunde „DA PUBLIC” pe WhatsApp.`,
    );
  } else {
    await supabase.from("listing_inspections").update({ decision_note: String(r?.reason || r?.error || "publish_failed") }).eq("id", insp.id);
    await sendAdminText(`⚠️ Aprobat, dar publicarea nu a reușit (${r?.reason || r?.error || "eroare"}). Verificați în Admin.`);
  }
}
