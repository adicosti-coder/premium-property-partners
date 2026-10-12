// Re-verifică cererile de acord „Așteaptă acord” din ultimele N zile cu filtrul extins:
// acord clar → salvează acordul și pornește publicarea; acord condiționat → reconfirmare.
// Refuzurile/DNC și mesajele ulterioare de refuz sunt sărite.
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { phoneVariants } from "../_shared/waPhone.ts";
import {
  detectPublishIntent, isConditionalConsent, isClearRefusal,
  PUBLISH_CONSENT_ACK, PUBLISH_CONSENT_RECONFIRM_TEXT,
} from "../_shared/waAutoReply.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-cron-secret",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const denied = await requireInternalOrAdmin(req, corsHeaders);
  if (denied) return denied;
  let body: { days?: number; dry_run?: boolean } = {};
  try { body = await req.json(); } catch { /* implicit */ }
  const days = Math.min(Math.max(Number(body.days) || 7, 1), 30);
  const dry = body.dry_run === true;

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(url, key);
  const since = new Date(Date.now() - days * 864e5).toISOString();

  const { data: rows } = await sb.from("wa_publish_consents")
    .select("id, phone_normalized, prospect_listing_id, created_at, requested_at")
    .eq("status", "requested").is("revoked_at", null).gte("created_at", since).limit(200);

  const results: Record<string, unknown>[] = [];
  for (const r of rows ?? []) {
    const variants = phoneVariants(r.phone_normalized);
    const { data: dnc } = await sb.from("wa_dnc_list").select("id").in("phone_normalized", variants).limit(1).maybeSingle()
      .then((x) => x, () => ({ data: null }));
    if (dnc) { results.push({ phone: r.phone_normalized, action: "skip_dnc" }); continue; }
    const { data: conv } = await sb.from("wa_conversations").select("id, window_expires_at")
      .in("phone_normalized", variants).order("last_inbound_at", { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
    if (!conv) continue;
    const { data: msgs } = await sb.from("wa_messages").select("content, created_at")
      .eq("conversation_id", conv.id).eq("direction", "inbound")
      .gte("created_at", r.requested_at ?? r.created_at).order("created_at", { ascending: true }).limit(50);
    const texts = (msgs ?? []).map((m) => String(m.content ?? ""));
    if (!texts.length) continue;
    if (texts.some((t) => isClearRefusal(t) || detectPublishIntent(t, { pendingConsent: true }) === "revoke")) {
      results.push({ phone: r.phone_normalized, action: "skip_refusal" }); continue;
    }
    const consentText = [...texts].reverse().find((t) => detectPublishIntent(t, { pendingConsent: true }) === "consent");
    const condText = consentText ? null : [...texts].reverse().find((t) => isConditionalConsent(t, { pendingConsent: true }));
    if (!consentText && !condText) { results.push({ phone: r.phone_normalized, action: "no_match" }); continue; }

    const windowOpen = !!conv.window_expires_at && new Date(conv.window_expires_at).getTime() > Date.now();
    const action = consentText ? "consent" : "reconfirm";
    let sent: unknown = null;
    if (!dry) {
      if (consentText) {
        await sb.from("wa_publish_consents").update({
          status: "granted", consent_text: consentText.slice(0, 1000),
          consented_at: new Date().toISOString(), notes: "recheck: filtru extins",
        }).eq("id", r.id);
        if (r.prospect_listing_id) {
          await fetch(`${url}/functions/v1/auto-publish-listing-worker`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, "x-cron-secret": key },
            body: JSON.stringify({ prospect_id: r.prospect_listing_id, triggered_by: "wa_consent_recheck", consent_id: r.id }),
          }).catch((e) => console.error("[recheck] publish trigger", e));
        }
      }
      // Text liber doar în fereastra de 24h (regulă Meta); altfel rămâne pentru echipă.
      if (windowOpen) {
        const res = await fetch(`${url}/functions/v1/wa-andrei-send`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-internal-secret": Deno.env.get("WA_ANDREI_INTERNAL_SECRET") || "" },
          body: JSON.stringify({
            conversation_id: conv.id,
            text: consentText ? PUBLISH_CONSENT_ACK : PUBLISH_CONSENT_RECONFIRM_TEXT,
            auto_kind: consentText ? "publish_consent" : "publish_consent_reconfirm",
          }),
        });
        sent = res.status;
      } else sent = "outside_24h_window";
    }
    results.push({ phone: r.phone_normalized, action, text: consentText ?? condText, sent });
  }
  return json({ checked: rows?.length ?? 0, dry_run: dry, results });
});
