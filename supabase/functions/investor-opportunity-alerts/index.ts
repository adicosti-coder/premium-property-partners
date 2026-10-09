// investor-opportunity-alerts — hourly cron. New sale listings (last 26h) priced clearly
// under their district median (opportunity score > 80 ≈ ≥10% below median) are sent to
// investor subscribers via the Meta-approved template „alerta_investitor_oportunitate”
// (works outside the 24h window). Status: sending → sent → delivered/read | failed.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isInternalCall } from "../_shared/cronAuth.ts";
import { isInternalWaNumber } from "../_shared/waInternalNumbers.ts";
import { phoneVariants } from "../_shared/waPhone.ts";
import { WA_BUSINESS_ACCOUNT_ID, WA_API_VERSION, waToken } from "../_shared/waConfig.ts";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
const eur = (n: number) => `${Math.round(n).toLocaleString("ro-RO")} €`;
const MAX_PER_SUB = 3;
const TEMPLATE = "alerta_investitor_oportunitate";

Deno.serve(async (req) => {
  if (!(await isInternalCall(req))) return json({ error: "unauthorized" }, 401);
  const base = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(base, key);

  const zp = await fetch(`${base}/functions/v1/zone-price-map`, { headers: { Authorization: `Bearer ${key}`, apikey: key } }).then((r) => r.json()).catch(() => null);
  if (!zp?.ok) return json({ error: "zone_prices_unavailable" }, 500);
  const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const KEYS: Record<string, string[]> = {
    "Centru / Cetate": ["cetate", "centru", "unirii", "victoriei"], Elisabetin: ["elisabetin"], Iosefin: ["iosefin"], Fabric: ["fabric"],
    "Nord / Aradului": ["complex stud", "circumval", "iulius", "lipovei", "torontal", "aradului", "bucovina", "ronat"], "Dumbrăvița": ["dumbr"],
    Sud: ["giroc", "martirilor", "soarelui", "judetean", "dambovi", "braytim", "sagului", "freidorf"], Periurban: ["mosnita", "ghiroda", "sacalaz", "chisoda"],
  };

  const since = new Date(Date.now() - 26 * 3600_000).toISOString();
  const { data: listings } = await sb.from("prospect_listings").select("id, title, zone, price, size, rooms, source_url")
    .eq("category", "vanzare").gte("created_at", since).gte("price", 20000).gte("size", 15).limit(500);

  const opps = (listings ?? []).flatMap((l: any) => {
    const n = norm(`${l.zone || ""} ${l.title || ""}`);
    const label = Object.keys(KEYS).find((k) => KEYS[k].some((x) => n.includes(x)));
    const z = zp.zones.find((x: any) => x.label === label);
    const median = z?.ppm ?? zp.city_ppm;
    const ppm = Number(l.price) / Number(l.size);
    if (!median || !(ppm > 600)) return [];
    const diff = (ppm - median) / median;
    const score = Math.max(0, Math.min(100, Math.round(60 - diff * 200)));
    return score > 80 && l.source_url ? [{ ...l, label: label ?? "Timișoara", median, ppm, diff, score }] : [];
  });

  // Șablonul Meta trebuie să fie APROBAT și să aibă exact 8 variabile în corp;
  // altfel nu trimitem nimic (Meta ar respinge oricum trimiterea).
  const token = waToken();
  const tplRes = token ? await fetch(`https://graph.facebook.com/${WA_API_VERSION}/${WA_BUSINESS_ACCOUNT_ID}/message_templates?name=${TEMPLATE}&fields=name,status,language,components&limit=20`,
    { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()).catch(() => null) : null;
  const tpl = (tplRes?.data ?? []).find((t: any) => t.name === TEMPLATE && t.status === "APPROVED" &&
    new Set((t.components?.find((c: any) => c.type === "BODY")?.text ?? "").match(/\{\{\d+\}\}/g) ?? []).size === 8);
  if (!tpl) {
    console.error(`[investor-alerts] template ${TEMPLATE} not approved/usable`, JSON.stringify(tplRes).slice(0, 300));
  }

  const { data: subs } = await sb.from("investor_alert_subscribers").select("id, phone_normalized, zones, max_price").is("unsubscribed_at", null);
  let sent = 0, failed = 0;
  for (const s of subs ?? []) {
    if (!tpl) break;
    if (isInternalWaNumber(s.phone_normalized)) continue;
    const { data: dnc } = await sb.from("wa_dnc_list").select("id").in("phone_normalized", phoneVariants(s.phone_normalized)).limit(1);
    if (dnc?.length) continue;
    const mine = opps.filter((o) => (!s.zones?.length || s.zones.includes(o.label)) && (!s.max_price || o.price <= s.max_price));
    let count = 0;
    for (const o of mine) {
      if (count >= MAX_PER_SUB) break;
      // Rezervarea unică (abonat, anunț) previne retrimiterea aceluiași anunț.
      const { error: dup } = await sb.from("investor_alert_deliveries")
        .insert({ subscriber_id: s.id, prospect_listing_id: o.id, score: o.score, status: "sending", template_name: TEMPLATE });
      if (dup) continue;
      count++;
      const mark = (patch: Record<string, unknown>) => sb.from("investor_alert_deliveries").update(patch).eq("subscriber_id", s.id).eq("prospect_listing_id", o.id);

      let { data: conv } = await sb.from("wa_conversations").select("id").in("phone_normalized", phoneVariants(s.phone_normalized)).limit(1).maybeSingle();
      if (!conv) {
        ({ data: conv } = await sb.from("wa_conversations").insert({ phone_normalized: s.phone_normalized }).select("id").maybeSingle());
      }
      if (!conv) { await mark({ status: "failed", error: "conversation_create_failed" }); failed++; continue; }

      const clean = (v: string) => v.replace(/[\r\n\t]+/g, " ").replace(/ {4,}/g, " ").trim().slice(0, 120) || "-";
      const type = o.rooms ? `Apartament ${o.rooms} ${Number(o.rooms) === 1 ? "cameră" : "camere"}` : (o.title || "Apartament");
      const hotelMonthly = (Number(o.price) * 0.094) / 12;
      const params = [
        o.label, type, eur(o.price), `${Math.round(o.ppm)} €/m²`, String(o.score),
        `${Math.abs(Math.round(o.diff * 100))}%`, `${eur(hotelMonthly)}/lună`,
        `https://realtrust.ro/analiza-anunt?url=${encodeURIComponent(o.source_url)}`,
      ].map((p) => clean(String(p)));

      const res = await fetch(`${base}/functions/v1/wa-andrei-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, apikey: key, "x-internal-secret": Deno.env.get("WA_ANDREI_INTERNAL_SECRET") || "" },
        body: JSON.stringify({ conversation_id: conv.id, template_name: TEMPLATE, template_language: tpl.language || "ro", template_params: params, auto_kind: `investor_opp_${o.id}` }),
      }).catch(() => null);
      const out = res ? await res.json().catch(() => ({})) : {};
      if (res?.ok) {
        await mark({ status: "sent", error: null, wa_message_id: out?.wa_message_id ?? null, sent_at: new Date().toISOString() });
        sent++;
      } else {
        await mark({ status: "failed", error: `http_${res?.status ?? "network"}: ${JSON.stringify(out?.details ?? out).slice(0, 300)}` });
        failed++;
      }
    }
  }
  return json({ ok: true, template: tpl ? "approved" : "not_approved", opportunities: opps.length, subscribers: subs?.length ?? 0, sent, failed });
});
