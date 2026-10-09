// investor-opportunity-alerts — hourly cron. New sale listings (last 26h) priced clearly
// under their district median (opportunity score > 80 ≈ ≥10% below median) are sent to
// investor subscribers on WhatsApp. Free-form messages only go out inside Meta's 24h
// window; otherwise the delivery is kept as „needs_template” (no template is used).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isInternalCall } from "../_shared/cronAuth.ts";
import { isInternalWaNumber } from "../_shared/waInternalNumbers.ts";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
const eur = (n: number) => `${Math.round(n).toLocaleString("ro-RO")} €`;
const MAX_PER_SUB = 3;

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

  const { data: subs } = await sb.from("investor_alert_subscribers").select("id, phone_normalized, zones, max_price").is("unsubscribed_at", null);
  let sent = 0, queued = 0;
  for (const s of subs ?? []) {
    if (isInternalWaNumber(s.phone_normalized)) continue;
    const { data: dnc } = await sb.from("wa_do_not_contact").select("phone").eq("phone", s.phone_normalized).maybeSingle().then((r: any) => r, () => ({ data: null }));
    if (dnc) continue;
    const mine = opps.filter((o) => (!s.zones?.length || s.zones.includes(o.label)) && (!s.max_price || o.price <= s.max_price));
    let count = 0;
    for (const o of mine) {
      if (count >= MAX_PER_SUB) break;
      const { error: dup } = await sb.from("investor_alert_deliveries").insert({ subscriber_id: s.id, prospect_listing_id: o.id, score: o.score });
      if (dup) continue; // already delivered/recorded
      count++;
      const { data: conv } = await sb.from("wa_conversations").select("id, window_expires_at").eq("phone_normalized", s.phone_normalized).limit(1).maybeSingle();
      const open = conv?.window_expires_at && new Date(conv.window_expires_at).getTime() > Date.now();
      if (!open) {
        await sb.from("investor_alert_deliveries").update({ status: "needs_template" }).eq("subscriber_id", s.id).eq("prospect_listing_id", o.id);
        queued++;
        continue;
      }
      const text = [
        `🔔 Oportunitate sub prețul pieței (scor ${o.score}/100)`,
        `${o.title || "Apartament"} · ${o.label}`,
        `${eur(o.price)} · ${Math.round(o.ppm)} €/m² (${Math.round(o.diff * 100)}% față de mediana ${Math.round(o.median)} €/m²)`,
        o.source_url,
        "Răspundeți STOP pentru dezabonare.",
      ].join("\n");
      const res = await fetch(`${base}/functions/v1/wa-andrei-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, apikey: key, "x-internal-secret": Deno.env.get("WA_ANDREI_INTERNAL_SECRET") || "" },
        body: JSON.stringify({ conversation_id: conv!.id, text, auto_kind: `investor_opp_${o.id}` }),
      }).catch(() => null);
      await sb.from("investor_alert_deliveries").update({ status: res?.ok ? "sent" : "failed", error: res?.ok ? null : `http_${res?.status ?? "network"}` })
        .eq("subscriber_id", s.id).eq("prospect_listing_id", o.id);
      if (res?.ok) sent++;
    }
  }
  return json({ ok: true, opportunities: opps.length, subscribers: subs?.length ?? 0, sent, needs_template: queued });
});
