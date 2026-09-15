// make-agent-bridge — puntea între automatizarea Make.com și WhatsApp.
//
// Acțiuni:
//  - action: "agent_reply"  → Make trimite răspunsul agentului, noi îl livrăm pe
//    WhatsApp către prospect (conversație completă, în același thread).
//  - action: "relay_lead"   → butonul din Admin: trimite lead-ul către agent prin
//    Make și, ca backup, poate trimite direct mesajul WhatsApp către prospect.
//
// Acces: apel intern (x-cron-secret / service role), Admin JWT, sau Make cu
// header x-make-secret === MAKE_INBOUND_SECRET.
import { createClient } from "npm:@supabase/supabase-js@2";
import { WA_PHONE_NUMBER_ID, WA_API_VERSION, waToken } from "../_shared/waConfig.ts";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { relayToMake } from "../_shared/makeRelay.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-cron-secret, x-make-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function timingSafeEq(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/** +40 7xx xxx xxx din diverse formate. Returnează null dacă nu e mobil RO valid. */
function normalizeRoMobile(raw: string): string | null {
  const digits = (raw || "").replace(/[^\d]/g, "");
  let d = digits;
  if (d.startsWith("0040")) d = d.slice(4);
  else if (d.startsWith("40")) d = d.slice(2);
  else if (d.startsWith("0")) d = d.slice(1);
  if (!/^7\d{8}$/.test(d)) return null;
  return `+40${d}`;
}

async function sendToMeta(payload: Record<string, unknown>) {
  const token = waToken();
  if (!token) return { ok: false, status: 500, error: "missing_meta_token", body: {} as any };
  const resp = await fetch(
    `https://graph.facebook.com/${WA_API_VERSION}/${WA_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  const body = await resp.json().catch(() => ({}));
  return {
    ok: resp.ok,
    status: resp.status,
    error: resp.ok ? null : (body?.error?.message ?? `http_${resp.status}`),
    body,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const makeSecret = Deno.env.get("MAKE_INBOUND_SECRET") || "";
  const providedMake = req.headers.get("x-make-secret") || "";
  const fromMake = !!makeSecret && timingSafeEq(makeSecret, providedMake);

  if (!fromMake) {
    const denied = await requireInternalOrAdmin(req, corsHeaders);
    if (denied) return denied;
  }

  let body: {
    action?: string;
    phone?: string;
    message?: string;
    lead_id?: string;
    prospect_listing_id?: string;
    also_whatsapp?: boolean;
    // Fereastra de 24h închisă: Make poate cere explicit trimiterea șablonului
    // aprobat, ca prospectul să primească totuși un mesaj (niciodată implicit).
    allow_template?: boolean;
    template_name?: string;
    template_language?: string;
  } = {};
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const action = (body.action || "agent_reply").trim();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ---------------------------------------------------------------- agent_reply
  if (action === "agent_reply") {
    const phone = normalizeRoMobile(body.phone || "");
    const text = (body.message || "").trim();
    if (!phone) return json({ error: "phone_invalid" }, 400);
    if (!text) return json({ error: "message_required" }, 400);

    // Conversația existentă sau una nouă, ca să rămână un thread complet.
    const { data: conv } = await supabase
      .from("wa_conversations")
      .select("id, window_expires_at, prospect_id")
      .eq("phone_normalized", phone)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let conversationId = conv?.id as string | undefined;
    if (!conversationId) {
      const { data: created, error: convErr } = await supabase
        .from("wa_conversations")
        .insert({
          phone_normalized: phone,
          status: "active",
          assigned_channel: "make_agent",
          prospect_id: body.prospect_listing_id ?? null,
        })
        .select("id")
        .single();
      if (convErr) return json({ error: "conversation_create_failed", details: convErr.message }, 500);
      conversationId = created.id;
    }

    const windowOpen = !!conv?.window_expires_at &&
      new Date(conv.window_expires_at).getTime() > Date.now();

    // Fereastra de 24h închisă → NU înlocuim răspunsul agentului cu un șablon
    // generic (clientul ar primi alt mesaj, iar în Admin ar apărea ca livrat).
    // Marcăm explicit mesajul ca nelivrat, ca să se vadă în Conversații live.
    if (!windowOpen && body.allow_template) {
      // Cerere explicită din Make: trimitem șablonul aprobat, marcat clar ca
      // șablon (nu pretindem că textul agentului a ajuns la client).
      const tplName = body.template_name ||
        Deno.env.get("WA_DEFAULT_TEMPLATE") || "intake_prospect_apartments";
      const tplLang = body.template_language || "ro";
      const sentTpl = await sendToMeta({
        messaging_product: "whatsapp",
        to: phone.replace(/^\+/, ""),
        type: "template",
        template: { name: tplName, language: { code: tplLang } },
      });
      const tplMsgId = sentTpl.body?.messages?.[0]?.id ?? null;

      await supabase.from("wa_messages").insert({
        conversation_id: conversationId,
        wa_message_id: tplMsgId,
        direction: "outbound",
        role: "assistant",
        content: `[șablon ${tplName}] (textul agentului nu poate fi livrat în afara ferestrei de 24h: ${text})`,
        template_name: tplName,
        error: sentTpl.ok ? null : String(sentTpl.error).slice(0, 500),
      });

      await supabase.from("make_lead_events").insert({
        direction: "inbound",
        event: "agent_reply",
        lead_id: body.lead_id ?? null,
        prospect_listing_id: body.prospect_listing_id ?? null,
        conversation_id: conversationId,
        phone_normalized: phone,
        message: text,
        status: sentTpl.ok ? "sent_template" : "failed",
        wa_message_id: tplMsgId,
        error: sentTpl.ok ? null : String(sentTpl.error).slice(0, 500),
        payload: {
          source: fromMake ? "make" : "internal",
          window_open: false,
          template_name: tplName,
          agent_text_delivered: false,
        },
      });

      return json(
        {
          ok: sentTpl.ok,
          delivered: false,
          template_sent: sentTpl.ok,
          template_name: tplName,
          conversation_id: conversationId,
          wa_message_id: tplMsgId,
          note: "agent_text_not_delivered_outside_24h_window",
          meta_error: sentTpl.ok ? undefined : sentTpl.error,
        },
        sentTpl.ok ? 200 : 502,
      );
    }

    if (!windowOpen) {
      await supabase.from("wa_messages").insert({
        conversation_id: conversationId,
        direction: "outbound",
        role: "assistant",
        content: text,
        error: "outside_24h_window_not_delivered",
      });
      await supabase.from("make_lead_events").insert({
        direction: "inbound",
        event: "agent_reply",
        lead_id: body.lead_id ?? null,
        prospect_listing_id: body.prospect_listing_id ?? null,
        conversation_id: conversationId,
        phone_normalized: phone,
        message: text,
        status: "failed",
        error: "outside_24h_window_not_delivered",
        payload: { source: fromMake ? "make" : "internal", window_open: false },
      });
      return json(
        {
          ok: false,
          delivered: false,
          conversation_id: conversationId,
          error: "outside_24h_window_not_delivered",
        },
        409,
      );
    }

    const sent = await sendToMeta({
      messaging_product: "whatsapp",
      to: phone.replace(/^\+/, ""),
      type: "text",
      text: { preview_url: false, body: text },
    });

    const waMsgId = sent.body?.messages?.[0]?.id ?? null;

    await supabase.from("wa_messages").insert({
      conversation_id: conversationId,
      wa_message_id: waMsgId,
      direction: "outbound",
      role: "assistant",
      content: text,
      error: sent.ok ? null : String(sent.error).slice(0, 500),
    });

    if (sent.ok) {
      await supabase.from("wa_conversations")
        .update({ last_outbound_at: new Date().toISOString() })
        .eq("id", conversationId);
    }

    await supabase.from("make_lead_events").insert({
      direction: "inbound",
      event: "agent_reply",
      lead_id: body.lead_id ?? null,
      prospect_listing_id: body.prospect_listing_id ?? null,
      conversation_id: conversationId,
      phone_normalized: phone,
      message: text,
      status: sent.ok ? "sent" : "failed",
      wa_message_id: waMsgId,
      error: sent.ok ? null : String(sent.error).slice(0, 500),
      payload: { source: fromMake ? "make" : "internal", window_open: windowOpen },
    });

    return json(
      {
        ok: sent.ok,
        conversation_id: conversationId,
        wa_message_id: waMsgId,
        delivered: sent.ok,
        meta_error: sent.ok ? undefined : sent.error,
      },
      sent.ok ? 200 : 502,
    );
  }

  // -------------------------------------------------------------- client_inbound
  // Make trimite mesajul primit de la client; noi îl salvăm în Admin și
  // răspundem automat (calificare la prima interacțiune, confirmare la 3 ore),
  // fără să fie nevoie ca agentul să răspundă manual.
  if (action === "client_inbound") {
    const phone = normalizeRoMobile(body.phone || "");
    const text = (body.message || "").trim();
    if (!phone) return json({ error: "phone_invalid" }, 400);
    if (!text) return json({ error: "message_required" }, 400);

    const nowIso = new Date().toISOString();
    const windowExp = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

    const { data: existingConv } = await supabase
      .from("wa_conversations")
      .select("id")
      .eq("phone_normalized", phone)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let convId = existingConv?.id as string | undefined;
    if (convId) {
      await supabase.from("wa_conversations").update({
        last_inbound_at: nowIso,
        window_expires_at: windowExp,
        ...(body.profile_name ? { wa_profile_name: body.profile_name } : {}),
      }).eq("id", convId);
    } else {
      const { data: createdConv, error: convErr } = await supabase
        .from("wa_conversations")
        .insert({
          phone_normalized: phone,
          status: "active",
          wa_profile_name: body.profile_name ?? null,
          last_inbound_at: nowIso,
          window_expires_at: windowExp,
        })
        .select("id")
        .single();
      if (convErr) return json({ error: "conversation_create_failed", details: convErr.message }, 500);
      convId = createdConv.id;
    }

    await supabase.from("wa_messages").insert({
      conversation_id: convId,
      wa_message_id: body.wa_message_id ?? null,
      direction: "inbound",
      role: "user",
      content: text,
    });

    await supabase.from("make_lead_events").insert({
      direction: "inbound",
      event: "wa_inbound_message",
      conversation_id: convId,
      phone_normalized: phone,
      message: text,
      status: "received",
      payload: { source: fromMake ? "make" : "internal", profile_name: body.profile_name ?? null },
    });

    // Ce răspuns automat se cuvine?
    const { count: outboundCount } = await supabase
      .from("wa_messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", convId)
      .eq("direction", "outbound");

    let replyKind: "intake" | "ack" | "skipped_recent_ack" = "intake";
    let replyText = "";
    if (outboundCount) {
      const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
      const { count: recentAck } = await supabase
        .from("wa_messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", convId)
        .eq("direction", "outbound")
        .gte("created_at", threeHoursAgo);
      if (recentAck) replyKind = "skipped_recent_ack";
      else { replyKind = "ack"; replyText = ACK_MESSAGE; }
    } else {
      const ctx = await loadProspectContext(supabase, phone);
      replyText = buildIntakeMessage(ctx);
    }

    if (replyKind === "skipped_recent_ack") {
      return json({
        ok: true,
        conversation_id: convId,
        auto_reply: "skipped_recent_ack",
        note: "clientul a primit deja un mesaj în ultimele 3 ore",
      });
    }

    const autoSent = await sendToMeta({
      messaging_product: "whatsapp",
      to: phone.replace(/^\+/, ""),
      type: "text",
      text: { preview_url: false, body: replyText },
    });
    const autoMsgId = autoSent.body?.messages?.[0]?.id ?? null;

    await supabase.from("wa_messages").insert({
      conversation_id: convId,
      wa_message_id: autoMsgId,
      direction: "outbound",
      role: "assistant",
      content: replyText,
      error: autoSent.ok ? null : String(autoSent.error).slice(0, 500),
    });

    if (autoSent.ok) {
      await supabase.from("wa_conversations")
        .update({ last_outbound_at: new Date().toISOString() })
        .eq("id", convId);
    }

    await supabase.from("make_lead_events").insert({
      direction: "outbound",
      event: replyKind === "intake" ? "wa_auto_intake" : "wa_auto_ack",
      conversation_id: convId,
      phone_normalized: phone,
      message: replyText,
      status: autoSent.ok ? "sent" : "failed",
      wa_message_id: autoMsgId,
      error: autoSent.ok ? null : String(autoSent.error).slice(0, 500),
      payload: { source: fromMake ? "make" : "internal", auto_reply: replyKind },
    });

    return json({
      ok: autoSent.ok,
      conversation_id: convId,
      auto_reply: replyKind,
      delivered: autoSent.ok,
      wa_message_id: autoMsgId,
      meta_error: autoSent.ok ? undefined : autoSent.error,
    }, autoSent.ok ? 200 : 502);
  }

  // ---------------------------------------------------------------- relay_lead
  if (action === "relay_lead") {
    const leadId = (body.lead_id || "").trim();
    if (!leadId) return json({ error: "lead_id_required" }, 400);

    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .select("id, name, whatsapp_number, message, source, created_at, property_type, property_area")
      .eq("id", leadId)
      .maybeSingle();
    if (leadErr || !lead) return json({ error: "lead_not_found" }, 404);

    const phone = normalizeRoMobile(lead.whatsapp_number || "");

    const relay = await relayToMake("agent_lead_manual", {
      lead_id: lead.id,
      name: lead.name,
      phone,
      message: lead.message,
      lead_source: lead.source,
      property_type: lead.property_type,
      property_area: lead.property_area,
      created_at: lead.created_at,
    });

    // Backup: dacă Make nu e disponibil (sau se cere explicit), trimitem mesajul
    // pe WhatsApp direct din sistem, ca prospectul să nu rămână fără răspuns.
    let waResult: Record<string, unknown> | null = null;
    if (phone && (body.also_whatsapp || !relay.ok)) {
      const sent = await sendToMeta({
        messaging_product: "whatsapp",
        to: phone.replace(/^\+/, ""),
        type: "template",
        template: {
          name: Deno.env.get("WA_DEFAULT_TEMPLATE") || "intake_prospect_apartments",
          language: { code: "ro" },
        },
      });
      waResult = {
        ok: sent.ok,
        wa_message_id: sent.body?.messages?.[0]?.id ?? null,
        error: sent.ok ? null : String(sent.error).slice(0, 300),
      };
    }

    await supabase.from("make_lead_events").insert({
      direction: "outbound",
      event: "relay_lead",
      lead_id: lead.id,
      phone_normalized: phone,
      message: lead.message,
      status: relay.ok ? "sent" : (waResult?.ok ? "sent_whatsapp_backup" : "failed"),
      wa_message_id: (waResult?.wa_message_id as string) ?? null,
      error: relay.ok ? null : (relay.error || relay.skipped || "make_failed"),
      payload: { relay, wa: waResult },
    });

    return json({ ok: relay.ok || !!waResult?.ok, relay, whatsapp: waResult });
  }

  return json({ error: "unknown_action", action }, 400);
});
