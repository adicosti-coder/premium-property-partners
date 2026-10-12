// Sumar zilnic 20:00 (WhatsApp admin + e-mail info@realtrust.ro): coadă, răspunsuri proprietari, publicări, alerte Meta.
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { sendAdminText } from "../_shared/listingInspection.ts";
import { sendTeamEmail } from "../_shared/teamEmail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-cron-secret",
};

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
const isYes = (t: string) => /^(da( public)?|de acord|ok|okay|publicati|👍)[\s.!]*$/.test(norm(t)) || t.includes("👍");
const isNo = (t: string) => /\b(nu|stop|nu multumesc|vandut|inchiriat|dezabonare)\b/.test(norm(t));

const isQuestion = (t: string) => /\?|\b(cat|cum|cand|unde|ce|care|de ce)\b/.test(norm(t));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const denied = await requireInternalOrAdmin(req, corsHeaders);
  if (denied) return denied;
  let reqBody: { force?: boolean } = {};
  try { reqBody = await req.json(); } catch { /* cron */ }
  // Cron rulează la 17:00 și 18:00 UTC; trimitem doar când la București e 20:00 (vară/iarnă).
  const bucHour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Bucharest", hour: "2-digit", hour12: false }).format(new Date()));
  if (!reqBody.force && bucHour !== 20) {
    return new Response(JSON.stringify({ skipped: "not_20_bucharest", bucHour }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const since = new Date(Date.now() - 864e5).toISOString();

  const [sent, pending, failed, inbound, published, detected, requests, imgLogs] = await Promise.all([
    sb.from("wa_outbound_queue").select("id", { count: "exact", head: true }).gte("sent_at", since),
    sb.from("wa_outbound_queue").select("id", { count: "exact", head: true }).eq("status", "pending"),
    sb.from("wa_outbound_queue").select("last_error").eq("status", "failed").gte("updated_at", since).limit(200),
    sb.from("wa_messages").select("content").eq("direction", "inbound").gte("created_at", since).limit(2000),
    sb.from("prospect_listings").select("id", { count: "exact", head: true }).gte("published_at", since),
    sb.from("prospect_listings").select("id", { count: "exact", head: true }).gte("created_at", since),
    sb.from("wa_publish_consents").select("id", { count: "exact", head: true }).gte("created_at", since),
    sb.from("admin_audit_log").select("details").eq("action", "gallery_image_filter").gte("created_at", since).limit(500),
  ]);
  // Analytics anunțuri: vizite (property_views) + clicuri pe linkurile anunțurilor (cta_analytics).
  const [viewsRes, clicksRes] = await Promise.all([
    sb.from("property_views").select("property_id").gte("viewed_at", since).limit(20000),
    sb.from("cta_analytics").select("id", { count: "exact", head: true })
      .in("cta_type", ["listing_cazare_click", "listing_details_click", "listing_contact_click"]).gte("created_at", since),
  ]);
  const viewRows = (viewsRes.data ?? []) as Array<{ property_id: string | null }>;
  const viewCounts: Record<string, number> = {};
  for (const v of viewRows) if (v.property_id) viewCounts[v.property_id] = (viewCounts[v.property_id] ?? 0) + 1;
  const top = Object.entries(viewCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  let topLines: string[] = [];
  if (top.length) {
    const { data: props } = await sb.from("properties").select("id, name").in("id", top.map(([id]) => id));
    const names = new Map((props ?? []).map((p: any) => [String(p.id), String(p.name ?? "Anunț")]));
    topLines = top.map(([id, n], i) => `   ${i + 1}. ${names.get(id) ?? "Anunț"} — ${n} accesări`);
  }
  if (viewsRes.error) console.error("[digest] views", viewsRes.error.message);
  if (clicksRes.error) console.error("[digest] clicks", clicksRes.error.message);
  const { data: socialRows } = await sb.from("social_autopost_logs")
    .select("platform, status, title, property_slug, error_message, external_id, created_at").gte("created_at", since).limit(200);
  const socialOk = (socialRows ?? []).filter((r: any) => r.status === "posted").length;
  const socialFail = (socialRows ?? []).filter((r: any) => r.status !== "posted") as any[];
  const socialPosted = (socialRows ?? []).filter((r: any) => r.status === "posted") as any[];
  const socialTime = (iso: string) => new Intl.DateTimeFormat("ro-RO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bucharest" }).format(new Date(iso));
  const socialLink = (r: any) => r.platform === "instagram"
    ? (r.external_id ? `https://instagram.com/p/${r.external_id}` : "")
    : (r.external_id ? `https://facebook.com/${r.external_id}` : "");
  const socialPostedLines = socialPosted.slice(0, 10).map((r) =>
    `   ↳ ${socialTime(r.created_at)} · ${r.platform === "instagram" ? "Instagram" : "Facebook"}: ${r.title ?? r.property_slug ?? "Anunț"}${socialLink(r) ? `\n     ${socialLink(r)}` : ""}`);
  const REASON_RO: Record<string, string> = {
    ai_logo: "logo/reclamă", ai_map: "hartă", ai_other: "grafic/text/fără legătură", blank_black: "neagră",
    blank_uniform: "goală/uniformă", corrupt: "coruptă", too_small_or_corrupt: "coruptă/prea mică", too_small: "rezoluție prea mică",
    not_image: "nu e imagine",
  };
  let imgKept = 0, imgDropped = 0;
  const imgReasons: Record<string, number> = {};
  for (const l of imgLogs.data ?? []) {
    const d = (l as any).details ?? {};
    imgKept += Number(d.kept) || 0;
    for (const x of d.dropped ?? []) {
      imgDropped++;
      const r = String(x.reason ?? "");
      const label = REASON_RO[r] ?? (r.startsWith("http_") ? "link indisponibil" : r || "necunoscut");
      imgReasons[label] = (imgReasons[label] ?? 0) + 1;
    }
  }
  const imgLines = Object.entries(imgReasons).sort((a, b) => b[1] - a[1]).map(([k, v]) => `   ↳ ${k}: ${v}`);

  let yes = 0, no = 0, questions = 0, other = 0;
  for (const m of inbound.data ?? []) {
    const t = String(m.content ?? "");
    if (isYes(t)) yes++; else if (isNo(t)) no++; else if (isQuestion(t)) questions++; else other++;
  }
  const errs: Record<string, number> = {};
  for (const f of failed.data ?? []) {
    const code = String(f.last_error ?? "necunoscut").match(/\b(13\d{4}|4\d{2}|5\d{2})\b/)?.[1] ?? String(f.last_error ?? "necunoscut").slice(0, 40);
    errs[code] = (errs[code] ?? 0) + 1;
  }
  const errLines = Object.entries(errs).map(([k, v]) => `   ↳ ${k}: ${v}`);
  const body = [
    `📋 Bilanț zilnic (ultimele 24h)`,
    `🆕 Anunțuri noi detectate: ${detected.count ?? 0}`,
    `✉️ Cereri de acord trimise: ${requests.count ?? 0}`,
    `📤 Mesaje trimise din coadă: ${sent.count ?? 0}`,
    `💬 Răspunsuri primite: ${yes + no + questions + other} (DA: ${yes} · Refuz: ${no} · Întrebări: ${questions} · altele: ${other})`,
    `🏠 Anunțuri publicate cu succes: ${published.count ?? 0}`,
    `📈 Analytics anunțuri: ${viewRows.length} vizite · ${clicksRes.count ?? 0} click-uri pe linkuri`,
    ...(topLines.length ? [`🏆 Top 3 cele mai vizitate:`, ...topLines] : [`🏆 Top 3: nicio vizită înregistrată`]),
    `🖼️ Galerii verificate: ${(imgLogs.data ?? []).length} · poze păstrate: ${imgKept} · excluse: ${imgDropped}`,
    ...imgLines,
    `⏳ Rămase în coadă: ${pending.count ?? 0}`,
    `⚠️ Erori Meta: ${(failed.data ?? []).length}`,
    ...errLines,
    `📣 Social media automat: ${socialOk} postări reușite · ${socialFail.length} eșuate (salvate ca draft)`,
    ...socialPostedLines,
    ...socialFail.slice(0, 5).map((r) => `   ↳ ${r.platform === "instagram" ? "Instagram" : "Facebook"}: ${r.title ?? r.property_slug ?? "Anunț"} — ${String(r.error_message ?? "eroare").slice(0, 90)}`),
    ...(socialFail.length ? [`   Vezi: https://realtrust.ro/admin/social-drafts`] : []),
  ].join("\n");

  const wa = await sendAdminText(body).catch((e) => ({ ok: false, error: String(e) }));
  const mail = await sendTeamEmail({
    to: "info@realtrust.ro",
    subject: `Sumar zilnic: ${sent.count ?? 0} trimise, ${yes} DA, ${published.count ?? 0} publicate`,
    html: `<pre style="font-family:inherit;font-size:14px">${body.replace(/</g, "&lt;")}</pre>`,
    source: "wa-daily-owner-summary",
  }, sb).catch((e) => ({ sent: false, error: String(e) }));

  return new Response(JSON.stringify({ body, wa, mail }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
