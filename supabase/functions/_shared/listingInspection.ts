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

// ── Șablon Meta aprobat pentru inspecție, folosit când fereastra de 24h e închisă ──
import { WA_BUSINESS_ACCOUNT_ID } from "./waConfig.ts";
export const INSPECTION_TEMPLATE_NAME = "inspectie_anunt_v1";
export const INSPECTION_TEMPLATE_LANG = "ro";

/** Variabilele de șablon nu pot conține rânduri noi, tab-uri sau >4 spații la rând. */
export function templateParam(v: unknown, max = 200): string {
  const s = String(v ?? "").replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").replace(/[*_~`]/g, "").trim();
  return (s || "—").slice(0, max);
}

const INSPECTION_TEMPLATE_DEF = {
  name: INSPECTION_TEMPLATE_NAME,
  language: INSPECTION_TEMPLATE_LANG,
  category: "UTILITY",
  components: [
    {
      type: "BODY",
      text: "Anunț nou pentru verificare internă RealTrust ({{1}}): {{2}}. Preț: {{3}}. Zonă: {{4}}. Observații: {{5}}. Alegeți mai jos dacă anunțul este aprobat pentru publicare pe site sau arhivat.",
      example: { body_text: [["Vânzare", "Apartament 2 camere luminos – Zona Iosefin", "75.000 €", "Iosefin", "date complete"]] },
    },
    { type: "BUTTONS", buttons: [{ type: "QUICK_REPLY", text: "Aprob" }, { type: "QUICK_REPLY", text: "Respinge" }] },
  ],
};

async function graph(path: string, init: RequestInit = {}) {
  const r = await fetch(`https://graph.facebook.com/v20.0/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${waToken()}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  return { ok: r.ok, j: await r.json().catch(() => ({})) as any };
}

/** Status-ul șablonului de inspecție; îl trimite la aprobare Meta dacă nu există. */
export async function ensureInspectionTemplate(): Promise<string> {
  if (!waToken()) return "missing_wa_token";
  const q = await graph(`${WA_BUSINESS_ACCOUNT_ID}/message_templates?name=${INSPECTION_TEMPLATE_NAME}&fields=name,status,language`);
  const t = (q.j?.data || []).find((x: any) => x.name === INSPECTION_TEMPLATE_NAME && x.language === INSPECTION_TEMPLATE_LANG);
  if (t) return String(t.status || "UNKNOWN");
  const c = await graph(`${WA_BUSINESS_ACCOUNT_ID}/message_templates`, { method: "POST", body: JSON.stringify(INSPECTION_TEMPLATE_DEF) });
  return c.ok ? String(c.j?.status || "PENDING") : `create_failed:${JSON.stringify(c.j).slice(0, 200)}`;
}

/** Trimite inspecția prin șablonul aprobat (permis și în afara ferestrei de 24h). */
export async function sendInspectionTemplate(inspectionId: string, p: { kind: string; title: string; price: string; zone: string; note: string }) {
  const status = await ensureInspectionTemplate();
  if (status !== "APPROVED") return { ok: false, error: `template_${status.toLowerCase()}` };
  return sendAdminWa({
    type: "template",
    template: {
      name: INSPECTION_TEMPLATE_NAME,
      language: { code: INSPECTION_TEMPLATE_LANG },
      components: [
        { type: "body", parameters: [p.kind, p.title, p.price, p.zone, p.note].map((v) => ({ type: "text", text: templateParam(v) })) },
        { type: "button", sub_type: "quick_reply", index: "0", parameters: [{ type: "payload", payload: `insp_ok:${inspectionId}` }] },
        { type: "button", sub_type: "quick_reply", index: "1", parameters: [{ type: "payload", payload: `insp_no:${inspectionId}` }] },
      ],
    },
  });
}

/** Erori Meta care înseamnă „fereastra de 24h e închisă”. */
export const isOutsideWindowError = (e?: string) => /131047|131051|re-engagement|24 hours/i.test(String(e || ""));

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
  // Butoane interactive (în fereastra 24h) sau butoane de șablon aprobat (msg.button.payload).
  const btn = String(msg?.interactive?.button_reply?.id || msg?.button?.payload || "");
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
    // Cerem automat acordul proprietarului (direct dacă fereastra e deschisă, altfel coada cu șablon aprobat).
    let consentStatus = "neprocesat";
    try {
      const { data: cronSecret } = await supabase.rpc("get_cron_reconcile_secret");
      const cr = await fetch(`${env.supabaseUrl}/functions/v1/wa-request-publish-consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-cron-secret": String(cronSecret || "") },
        body: JSON.stringify({ prospect_ids: [insp.prospect_listing_id] }),
      });
      const cj = await cr.json().catch(() => ({}));
      consentStatus = cj?.results?.[0]?.status || (cr.ok ? "trimis" : `eroare ${cr.status}`);
    } catch (e) {
      consentStatus = `eroare ${String(e)}`;
    }
    const label: Record<string, string> = {
      sent: "cererea de acord a fost trimisă proprietarului",
      queued: "cererea de acord a intrat în coada WhatsApp (șablon aprobat)",
      already_queued: "proprietarul are deja un mesaj în coadă",
      invalid_phone: "anunțul nu are un număr de telefon valid",
      express_opt_out: "proprietarul a cerut să nu fie contactat",
    };
    await sendAdminText(
      `👍 Aprobat: ${insp.clean_title}\n${label[consentStatus] ?? `cerere acord: ${consentStatus}`}. Se publică automat după acordul proprietarului.`,
    );
  } else {
    await supabase.from("listing_inspections").update({ decision_note: String(r?.reason || r?.error || "publish_failed") }).eq("id", insp.id);
    await sendAdminText(`⚠️ Aprobat, dar publicarea nu a reușit (${r?.reason || r?.error || "eroare"}). Verificați în Admin.`);
  }
}
