// analyzed-price-watch — hourly cron. When a listing analysed on /analiza-anunt
// drops to its target price (target_high) in the scraper data, alert the admin
// (in-app notification + WhatsApp). Publishes automatically ONLY when the owner
// already gave the WhatsApp „DA” consent (via publish-consented-listing).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isInternalCall } from "../_shared/cronAuth.ts";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
const eur = (n: number) => `${Math.round(n).toLocaleString("ro-RO")} €`;
const ADMIN_PHONE = "+40723154520";

Deno.serve(async (req) => {
  if (!(await isInternalCall(req))) return json({ error: "unauthorized" }, 401);
  const base = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(base, key);
  const since = new Date(Date.now() - 90 * 86400_000).toISOString();

  const { data: rows } = await sb.from("analyzed_listings")
    .select("id, url, extracted_data, negotiation_range, calculated_score")
    .is("price_alert_sent_at", null).gte("created_at", since)
    .order("created_at", { ascending: false }).limit(500);

  const seen = new Set<string>();
  const hits: Array<{ prospectId: string | null; id: string; url: string; title: string; asked: number; now: number; low: number; high: number }> = [];
  for (const r of rows ?? []) {
    if (seen.has(r.url)) continue;
    seen.add(r.url);
    const high = Number((r.negotiation_range as any)?.target_high) || 0;
    const asked = Number((r.extracted_data as any)?.pret_listare) || 0;
    if (!high || !asked) continue;
    const bare = r.url.replace(/^https:\/\/www\./, "https://");
    const { data: p } = await sb.from("prospect_listings").select("id, price")
      .in("source_url", [r.url, bare, bare.replace("https://", "https://www.")]).limit(1).maybeSingle();
    const now = Number(p?.price) || 0;
    if (now > 0 && now < asked && now <= high) {
      hits.push({ prospectId: p?.id ?? null, id: r.id, url: r.url, title: String((r.extracted_data as any)?.titlu || "Anunț"), asked, now, low: Number((r.negotiation_range as any)?.target_low) || high, high });
    }
  }

  if (hits.length) {
    const { data: admins } = await sb.from("user_roles").select("user_id").eq("role", "admin");
    const { data: conv } = await sb.from("wa_conversations").select("id").eq("phone_normalized", ADMIN_PHONE).limit(1).maybeSingle();
    for (const h of hits) {
      let published = false;
      if (h.prospectId) {
        const { data: c } = await sb.from("wa_publish_consents").select("id")
          .eq("prospect_listing_id", h.prospectId).not("consented_at", "is", null).is("revoked_at", null)
          .is("published_at", null).limit(1).maybeSingle();
        if (c) {
          const res = await fetch(`${base}/functions/v1/publish-consented-listing`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, apikey: key },
            body: JSON.stringify({ prospect_id: h.prospectId }),
          }).catch(() => null);
          published = !!(res && res.ok && (await res.json().catch(() => ({})))?.success);
        }
      }
      const msg = (published ? "✅ Publicat automat (acord DA). " : "") + `${h.title}: ${eur(h.asked)} → ${eur(h.now)} (țintă ${eur(h.low)}–${eur(h.high)}). ${h.url}`;
      await sb.from("user_notifications").insert((admins ?? []).map((a: any) => ({
        user_id: a.user_id, type: "info", title: "📉 Anunț ajuns la prețul țintă", message: msg.slice(0, 500),
      })));
      if (conv) {
        await fetch(`${base}/functions/v1/wa-andrei-send`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, apikey: key, "x-internal-secret": Deno.env.get("WA_ANDREI_INTERNAL_SECRET") || "" },
          body: JSON.stringify({ conversation_id: conv.id, text: `📉 Preț țintă atins\n${msg}`, auto_kind: `price_target_${h.id}` }),
        }).catch(() => undefined);
      }
      await sb.from("analyzed_listings").update({ price_alert_sent_at: new Date().toISOString(), price_alert_price: h.now }).eq("url", h.url);
    }
  }
  return json({ ok: true, checked: seen.size, alerts: hits.length });
});
