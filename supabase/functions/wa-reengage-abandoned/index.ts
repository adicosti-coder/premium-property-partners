// wa-reengage-abandoned — recontactare pentru conversațiile abandonate.
//
// „Abandonată” = clientul a scris ultimul (sau nu a mai răspuns după mesajul
// nostru) și au trecut peste `min_hours` ore fără nicio activitate. Trimitem un
// singur mesaj de recontactare la maximum 7 zile per conversație și anunțăm Make.
//
// Acces: apel intern (x-cron-secret / service role) sau Admin JWT.
import { createClient } from "npm:@supabase/supabase-js@2";
import { isInternalWaNumber } from "../_shared/waInternalNumbers.ts";
import { WA_PHONE_NUMBER_ID, WA_API_VERSION, waToken } from "../_shared/waConfig.ts";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { relayToMake } from "../_shared/makeRelay.ts";
import { buildReengageMessage, loadProspectContext } from "../_shared/waAutoReply.ts";
import { phoneVariants, releasePhoneSend, reservePhoneSend, toWaDigits } from "../_shared/waPhone.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const REENGAGE_MARK = "[recontactare]";


async function sendToMeta(payload: Record<string, unknown>) {
  const token = waToken();
  if (!token) return { ok: false, error: "missing_meta_token", body: {} as any };
  const resp = await fetch(
    `https://graph.facebook.com/${WA_API_VERSION}/${WA_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  const body = await resp.json().catch(() => ({}));
  return { ok: resp.ok, error: resp.ok ? null : (body?.error?.message ?? `http_${resp.status}`), body };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const denied = await requireInternalOrAdmin(req, corsHeaders);
  if (denied) return denied;

  let body: {
    min_hours?: number;
    limit?: number;
    dry_run?: boolean;
    // Admin poate recontacta o singură discuție abandonată, din Analiză conversații.
    conversation_id?: string;
  } = {};
  try { body = await req.json(); } catch { /* default */ }
  const minHours = Math.max(2, Number(body.min_hours ?? 24));
  const limit = Math.min(25, Math.max(1, Number(body.limit ?? 10)));
  const dryRun = !!body.dry_run;
  const onlyConversation = (body.conversation_id || "").trim();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const cutoff = new Date(Date.now() - minHours * 3600 * 1000).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  const baseQuery = supabase
    .from("wa_conversations")
    .select("id, phone_normalized, wa_profile_name, last_inbound_at, last_outbound_at, status");
  const { data: convs, error: convErr } = await (onlyConversation
    ? baseQuery.eq("id", onlyConversation).limit(1)
    : baseQuery
        .not("last_inbound_at", "is", null)
        .lt("last_inbound_at", cutoff)
        .order("last_inbound_at", { ascending: true })
        .limit(200));
  if (convErr) return json({ error: "query_failed", details: convErr.message }, 500);

  const results: Record<string, unknown>[] = [];
  let sent = 0;
  let skipped = 0;

  for (const c of convs ?? []) {
    if (results.length >= limit) break;
    if (c.status === "closed" || c.status === "opted_out") { skipped++; continue; }

    const digits = toWaDigits(c.phone_normalized) ?? "";
    const variants = phoneVariants(c.phone_normalized);
    if (!digits) { results.push({ conversation_id: c.id, skipped: "invalid_phone" }); skipped++; continue; }
    // Numerele interne (administrare / numerele RealTrust) nu primesc niciodată
    // mesaje de prospectare sau recontactare.
    if (isInternalWaNumber(digits)) {
      results.push({ conversation_id: c.id, skipped: "internal_number" });
      skipped++;
      continue;
    }

    // Lista de excludere (DNC / STOP / nelivrabil) — blocaj permanent.
    const { data: dnc } = await supabase
      .from("wa_dnc_list")
      .select("id")
      .in("phone_normalized", variants)
      .limit(1)
      .maybeSingle();
    if (dnc) { results.push({ conversation_id: c.id, skipped: "dnc" }); skipped++; continue; }

    // Ultima activitate a noastră mai nouă decât ultimul mesaj al clientului
    // și tot fără răspuns → tot abandonată, dar nu insistăm dacă e recentă.
    if (!onlyConversation && c.last_outbound_at && c.last_outbound_at > cutoff) { skipped++; continue; }

    // O singură recontactare la 7 zile
    const { count: recent } = await supabase
      .from("wa_messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", c.id)
      .eq("direction", "outbound")
      .ilike("content", `${REENGAGE_MARK}%`)
      .gte("created_at", weekAgo);
    if (recent) { skipped++; continue; }

    // Respectă „nu contacta” (blocajele tehnice permit WhatsApp)
    const { data: prospect } = await supabase
      .from("prospect_listings")
      .select("id, do_not_call, do_not_call_reason")
      .in("phone_normalized", variants)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (prospect?.do_not_call) {
      const { data: technical } = await supabase.rpc("wa_is_technical_block_only", {
        _reason: prospect.do_not_call_reason ?? null,
      });
      if (!technical) {
        results.push({ conversation_id: c.id, skipped: "do_not_contact" });
        skipped++;
        continue;
      }
    }

    // Recontactarea se face DOAR ca mesaj liber, în fereastra de 24h deschisă
    // de client. În afara ferestrei, singurul șablon aprobat este cel de prim
    // contact — retrimiterea lui ar însemna un mesaj de prim contact duplicat
    // către cineva care ne-a scris deja, deci nu trimitem nimic.
    const windowOpen = !!c.last_inbound_at &&
      Date.now() - new Date(c.last_inbound_at).getTime() < 23.5 * 3600 * 1000;
    if (!windowOpen) {
      results.push({ conversation_id: c.id, skipped: "window_closed_no_duplicate_intro" });
      skipped++;
      continue;
    }

    const ctx = await loadProspectContext(supabase, c.phone_normalized);
    const text = buildReengageMessage(ctx);

    if (dryRun) {
      results.push({ conversation_id: c.id, phone: c.phone_normalized, would_send: true });
      continue;
    }

    // Rezervare ÎNAINTE de apelul Meta: max 1 recontactare / număr / 7 zile,
    // indiferent de câte rulări pornesc în paralel.
    const reserved = await reservePhoneSend(supabase, digits, "reengage", 7 * 24 * 3600 * 1000, { conversation_id: c.id });
    if (!reserved) { results.push({ conversation_id: c.id, skipped: "already_reserved" }); skipped++; continue; }

    const tplName = null as string | null;
    const meta = await sendToMeta({
      messaging_product: "whatsapp",
      to: digits,
      type: "text",
      text: { preview_url: false, body: text },
    });
    const waMsgId = meta.body?.messages?.[0]?.id ?? null;
    if (!meta.ok && meta.error === "missing_meta_token") await releasePhoneSend(supabase, digits, "reengage");

    await supabase.from("wa_messages").insert({
      conversation_id: c.id,
      wa_message_id: waMsgId,
      direction: "outbound",
      role: "assistant",
      content: `${REENGAGE_MARK} ${text}`,
      template_name: tplName,
      error: meta.ok ? null : String(meta.error).slice(0, 500),
    });

    if (meta.ok) {
      await supabase.from("wa_conversations")
        .update({ last_outbound_at: new Date().toISOString() })
        .eq("id", c.id);
      sent++;
    }

    const relay = await relayToMake("wa_reengage_sent", {
      conversation_id: c.id,
      phone: c.phone_normalized,
      profile_name: c.wa_profile_name,
      prospect_listing_id: prospect?.id ?? null,
      template_name: tplName,
      hours_idle: minHours,
      delivered: meta.ok,
      meta_error: meta.ok ? null : meta.error,
    });

    await supabase.from("make_lead_events").insert({
      direction: "outbound",
      event: "wa_reengage_sent",
      conversation_id: c.id,
      prospect_listing_id: prospect?.id ?? null,
      phone_normalized: c.phone_normalized,
      message: text,
      status: meta.ok ? "sent_template" : "failed",
      wa_message_id: waMsgId,
      error: meta.ok ? null : String(meta.error).slice(0, 500),
      payload: { template_name: tplName, relay, min_hours: minHours },
    });

    results.push({
      conversation_id: c.id,
      phone: c.phone_normalized,
      delivered: meta.ok,
      meta_error: meta.ok ? undefined : meta.error,
    });
  }

  return json({ ok: true, candidates: convs?.length ?? 0, sent, skipped, dry_run: dryRun, results });
});
