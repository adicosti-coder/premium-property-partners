// outreach-dispatch — trimite un anunț nou de proprietar privat către scenariul
// Make.com de Outreach (MAKE_OUTREACH_WEBHOOK_URL) și îl marchează "outreach_pending".
// Apelat de triggerul trg_fire_make_outreach (x-cron-secret) sau de Admin (test, dry_run).
// Reguli: doar mobile 07…, cel mult un mesaj la 30 de zile pe număr, trimitere doar
// 09:00–19:30 (ora României); în afara intervalului anunțul intră în `queued` și pleacă
// la 09:05 prin jobul `wa.owner_outreach_queue_drain` (body { action: "drain_queue" }).
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { toOutreachPhone, phoneVariants, reservePhoneSend, markPhoneSent, releasePhoneSend } from "../_shared/waPhone.ts";
import { outreachWindow, OUTREACH_COOLDOWN_DAYS, OUTREACH_COOLDOWN_KIND } from "../_shared/ownerOutreachPolicy.ts";
import { isTestPhone } from "../_shared/testPhoneAllowlist.ts";
import { rentalFirstMessage } from "../_shared/rentalIntroMessage.ts";
import { WA_OWNER_OUTREACH_TEMPLATE, WA_OWNER_OUTREACH_LANGUAGE, ownerOutreachPreviewUrl, ownerOutreachZone } from "../_shared/waOwnerOutreachTemplate.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type Result = { status: number; body: Record<string, unknown> };
// deno-lint-ignore no-explicit-any
type Sb = any;

async function dispatchOne(sb: Sb, id: string, opts: { dryRun: boolean; fromQueue: boolean }): Promise<Result> {
  const { data: p, error } = await sb.from("prospect_listings")
    .select("id,title,description,location,zone,price,rooms,source_url,category,phone_normalized,contact_phone,seller_type,agency_suspicion_score,do_not_call,auto_blacklisted_at,lifecycle_status,outreach_status,outreach_scheduled_at")
    .eq("id", id).maybeSingle();
  if (error) return { status: 500, body: { error: error.message } };
  if (!p) return { status: 404, body: { error: "not_found" } };

  // Doar mobile românești (07… / +407…); fixele și VoIP nu primesc mesaj.
  const phone = toOutreachPhone(p.phone_normalized || p.contact_phone);
  const reasons: string[] = [];
  if (!phone) reasons.push("not_mobile");

  // Numărul de test al lui Adrian ocolește și excluderea de contact, și verificarea de agenție.
  if (((p.agency_suspicion_score ?? 0) >= 70 || ["agency", "agentie"].includes(String(p.seller_type || ""))) && !isTestPhone(phone)) reasons.push("agency");
  if ((p.do_not_call || p.auto_blacklisted_at) && !isTestPhone(phone)) reasons.push("excluded");
  if (["rejected", "expired", "failed", "posted"].includes(String(p.lifecycle_status))) reasons.push("closed");
  // Doar locuințe din Timiș: anunțurile din alte orașe sau terenurile nu primesc mesaj.
  const text = `${p.title ?? ""} ${p.location ?? ""} ${String(p.description ?? "").slice(0, 400)}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/bucuresti|\bsector [1-6]\b|berceni|iancului|mihai bravu|pipera|ilfov|turda|cluj|\biasi\b|brasov|constanta|\barad\b(?! *(calea|str))/.test(text)) reasons.push("out_of_area");
  if (/\bteren\b|\bterenuri\b|spatiu comercial|hala\b/.test(String(p.title ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))) reasons.push("not_residential");
  const queuedRun = p.outreach_status === "queued" && opts.fromQueue;
  if (p.outreach_status && !opts.dryRun && !queuedRun) reasons.push(p.outreach_status === "queued" ? "already_queued" : "already_sent");

  const skip = async (r: string[]): Promise<Result> => {
    // Un anunț din coadă care nu mai poate pleca iese din coadă, cu motivul notat.
    if (queuedRun) {
      await sb.from("prospect_listings").update({
        outreach_status: "skipped", outreach_status_at: new Date().toISOString(), outreach_error: r.join(",").slice(0, 300), outreach_scheduled_at: null,
      }).eq("id", id);
    }
    return { status: 200, body: { ok: false, skipped: r } };
  };
  if (reasons.length) return skip(reasons);

  const payload = {
    id: p.id, phone: phone ?? "", title: p.title ?? "", zone: p.zone ?? "",
    price: p.price != null ? String(p.price) : "", source_url: p.source_url ?? "",
    type: p.category === "vanzare" ? "vanzare" : "inchiriere",
    listing_type: p.category === "vanzare" ? "vanzare" : "inchiriere",
    rooms: p.rooms != null ? String(p.rooms) : "",
    // Textul primului mesaj pentru închiriere; Make îl poate mapa direct din `message`.
    message: p.category === "vanzare" ? "" : rentalFirstMessage(p.rooms, p.zone),
    // Șablonul Meta cu 3 butoane: {{1}} = template_zone, {{2}} = preview_url.
    // Make raportează înapoi `template` în outreach-status, ca răspunsul „DA” scris să conteze ca acord.
    template_name: WA_OWNER_OUTREACH_TEMPLATE,
    template_language: WA_OWNER_OUTREACH_LANGUAGE,
    template_zone: ownerOutreachZone(p),
    preview_url: ownerOutreachPreviewUrl(p),
  };

  const win = outreachWindow(new Date());
  if (opts.dryRun) return { status: 200, body: { ok: true, dry_run: true, payload, window_open: win.open, next_send_at: win.nextSendAt.toISOString() } };

  const url = Deno.env.get("MAKE_OUTREACH_WEBHOOK_URL");
  if (!url) return { status: 200, body: { ok: false, skipped: ["webhook_not_configured"] } };

  // În afara intervalului 09:00–19:30 → coadă pentru următorul 09:05.
  if (!win.open) {
    const at = win.nextSendAt.toISOString();
    await sb.from("prospect_listings").update({
      outreach_status: "queued", outreach_status_at: new Date().toISOString(), outreach_scheduled_at: at, outreach_error: null,
    }).eq("id", id);
    return { status: 200, body: { ok: true, status: "queued", scheduled_for: at } };
  }

  // Cel mult un mesaj de outreach la 30 de zile pe același număr (orice anunț al lui).
  const cooldownMs = OUTREACH_COOLDOWN_DAYS * 86400000;
  const testPhone = isTestPhone(phone);
  if (!testPhone) {
    const since = new Date(Date.now() - cooldownMs).toISOString();
    const variants = phoneVariants(phone);
    const ors = variants.flatMap((v: string) => [`phone_normalized.eq.${v}`, `contact_phone.eq.${v}`]).join(",");
    const { count: recent } = await sb.from("prospect_listings")
      .select("id", { count: "exact", head: true })
      .or(ors).neq("id", id).gte("outreach_status_at", since)
      .not("outreach_status", "in", "(queued,failed,skipped)");
    if (recent) return skip(["recent_outreach_30d"]);
    // Numărul a scris RETRAG / Nu / S-a vândut → nu mai primește outreach pe niciun anunț.
    const { count: unsub } = await sb.from("prospect_listings")
      .select("id", { count: "exact", head: true }).or(ors).eq("outreach_status", "unsubscribed");
    if (unsub) return skip(["unsubscribed"]);
    if (!await reservePhoneSend(sb, phone, OUTREACH_COOLDOWN_KIND, cooldownMs, { prospect_id: id })) return skip(["recent_outreach_30d"]);
  }

  const now = new Date().toISOString();
  await sb.from("prospect_listings").update({ outreach_status: "outreach_pending", outreach_status_at: now, outreach_error: null, outreach_scheduled_at: null }).eq("id", id);
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(10_000) });
    if (!r.ok) throw new Error(`http_${r.status}: ${(await r.text()).slice(0, 200)}`);
    if (!testPhone) await markPhoneSent(sb, phone, OUTREACH_COOLDOWN_KIND, { prospect_id: id });
    return { status: 200, body: { ok: true, status: "outreach_pending" } };
  } catch (e) {
    if (!testPhone) await releasePhoneSend(sb, phone, OUTREACH_COOLDOWN_KIND);
    await sb.from("prospect_listings").update({ outreach_status: "failed", outreach_status_at: new Date().toISOString(), outreach_error: String(e).slice(0, 300) }).eq("id", id);
    return { status: 502, body: { ok: false, error: String(e) } };
  }
}

/** Trimite anunțurile din coadă (programate pentru 09:05), în limita unui buget de timp. */
async function drainQueue(sb: Sb, dryRun: boolean): Promise<Result> {
  if (!outreachWindow(new Date()).open) return { status: 200, body: { ok: true, skipped: "outside_window" } };
  const { data: rows, error } = await sb.from("prospect_listings")
    .select("id").eq("outreach_status", "queued").lte("outreach_scheduled_at", new Date().toISOString())
    .order("outreach_scheduled_at", { ascending: true }).limit(15);
  if (error) return { status: 500, body: { error: error.message } };
  if (dryRun) return { status: 200, body: { ok: true, dry_run: true, due: rows?.length ?? 0 } };
  const started = Date.now();
  const tally = { sent: 0, skipped: 0, failed: 0 };
  for (const r of rows ?? []) {
    if (Date.now() - started > 35_000) break; // sub timeout-ul orchestratorului
    const res = await dispatchOne(sb, r.id, { dryRun: false, fromQueue: true });
    if (res.body.ok) tally.sent++; else if (res.body.skipped) tally.skipped++; else tally.failed++;
  }
  return { status: 200, body: { ok: true, ...tally } };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const denied = await requireInternalOrAdmin(req, corsHeaders);
  if (denied) return denied;

  let body: { prospect_id?: string; dry_run?: boolean; action?: string } = {};
  try { body = await req.json(); } catch { /* */ }
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  if (body.action === "drain_queue") {
    const res = await drainQueue(sb, !!body.dry_run);
    return json(res.body, res.status);
  }

  const id = String(body.prospect_id || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "prospect_id invalid" }, 400);
  const res = await dispatchOne(sb, id, { dryRun: !!body.dry_run, fromQueue: false });
  return json(res.body, res.status);
});
