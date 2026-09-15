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
import { ACK_MESSAGE, buildIntakeMessage, loadProspectContext } from "../_shared/waAutoReply.ts";
import { notifyAgentInbound } from "../_shared/waAgentNotify.ts";

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
    profile_name?: string;
    wa_message_id?: string;
    property_id?: string;
    conversation_id?: string;
    // Pasul de tranzacție trimite implicit și mesajul cu pașii următori.
    skip_followup?: boolean;
  } = {};
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  let action = (body.action || "agent_reply").trim();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ------------------------------------------------------------- property_offer
  // Pasul de tranzacție: apartamentul ales de client. Construim mesajul cu
  // anunțul din baza de date, îl trimitem pe WhatsApp prin fluxul agent_reply
  // și înregistrăm tranzacția (dashboard + Make).
  type OfferProp = {
    id: string;
    name: string;
    slug: string | null;
    rooms: number | null;
    size: number | null;
    location: string | null;
    price: number | null;
    url: string;
  };
  let offerProp: OfferProp | null = null;

  if (action === "property_offer") {
    const propertyId = (body.property_id || "").trim();
    if (!propertyId) return json({ error: "property_id_required" }, 400);
    const { data: prop, error: propErr } = await supabase
      .from("properties")
      .select("id, name, slug, rooms, size, location, capital_necesar, price_per_sqm")
      .eq("id", propertyId)
      .maybeSingle();
    if (propErr) return json({ error: "property_lookup_failed", details: propErr.message }, 500);
    if (!prop) return json({ error: "property_not_found" }, 404);

    const price = Number(prop.capital_necesar) ||
      (prop.price_per_sqm && prop.size ? Math.round(Number(prop.price_per_sqm) * Number(prop.size)) : 0);
    const url = `https://realtrust.ro/proprietate/${prop.slug}`;
    offerProp = {
      id: prop.id as string,
      name: prop.name as string,
      slug: (prop.slug as string) ?? null,
      rooms: (prop.rooms as number) ?? null,
      size: (prop.size as number) ?? null,
      location: (prop.location as string) ?? null,
      price: price || null,
      url,
    };

    const details = [
      prop.rooms ? `${prop.rooms} camere` : null,
      prop.size ? `${prop.size} m²` : null,
      prop.location || null,
    ].filter(Boolean).join(" · ");

    body.message = (body.message || "").trim() || [
      `Apartamentul ales: ${prop.name}`,
      details || null,
      price ? `Preț: ${price.toLocaleString("ro-RO")} €` : null,
      "",
      `Detalii complete și poze: ${url}`,
      "Dacă doriți, vă pregătim actele și programăm vizionarea.",
    ].filter((l) => l !== null).join("\n");

    action = "agent_reply";
  }

  /** Înregistrează pasul de tranzacție și îl anunță în Make. */
  const logOffer = async (opts: {
    conversationId?: string;
    waMsgId?: string | null;
    ok: boolean;
    status: string;
    error?: string | null;
    agentId?: string | null;
  }) => {
    if (!offerProp) return;
    const phone = normalizeRoMobile(body.phone || "") || (body.phone || "");
    await supabase.from("wa_transaction_events").insert({
      conversation_id: opts.conversationId ?? null,
      agent_id: opts.agentId ?? null,
      phone_normalized: phone,
      property_id: offerProp.id,
      property_name: offerProp.name,
      property_slug: offerProp.slug,
      property_url: offerProp.url,
      price: offerProp.price,
      event: opts.ok ? "offer_sent" : "offer_failed",
      status: opts.status,
      wa_message_id: opts.waMsgId ?? null,
      error: opts.error ? String(opts.error).slice(0, 500) : null,
      source: fromMake ? "make" : "admin",
      payload: { rooms: offerProp.rooms, size: offerProp.size, location: offerProp.location },
    });
    await relayToMake("wa_property_offer", {
      phone,
      property: offerProp,
      status: opts.status,
      delivered: opts.ok,
      conversation_id: opts.conversationId ?? null,
      agent_id: opts.agentId ?? null,
      wa_message_id: opts.waMsgId ?? null,
      error: opts.error ?? null,
    });
  };

  /**
   * După apartamentul ales, discuția continuă singură: trimitem imediat pașii
   * următori (ofertă, vizionare, negociere, acte) ca mesaj separat în același
   * thread, îl salvăm ca pas de tranzacție și îl anunțăm în Make.
   */
  const sendOfferFollowup = async (
    conversationId: string,
    phone: string,
    agentId: string | null,
  ) => {
    if (!offerProp) return null;
    const text = [
      `Pașii următori pentru ${offerProp.name}:`,
      "1) Ofertă — vă trimitem prețul final, comisionul și costurile de achiziție.",
      "2) Vizionare — stabilim ziua și ora care vă convine.",
      "3) Negociere — transmitem oferta dvs. proprietarului și revenim cu decizia.",
      "4) Acte — antecontract, plată și programare la notar.",
      "",
      offerProp.price
        ? `Preț de pornire: ${Number(offerProp.price).toLocaleString("ro-RO")} €. Cu ce sumă doriți să intrăm în negociere?`
        : "Cu ce sumă doriți să intrăm în negociere?",
      `Anunțul complet: ${offerProp.url}`,
    ].join("\n");

    const sent = await sendToMeta({
      messaging_product: "whatsapp",
      to: phone.replace(/^\+/, ""),
      type: "text",
      text: { preview_url: false, body: text },
    });
    const msgId = sent.body?.messages?.[0]?.id ?? null;

    await supabase.from("wa_messages").insert({
      conversation_id: conversationId,
      wa_message_id: msgId,
      direction: "outbound",
      role: "assistant",
      content: text,
      error: sent.ok ? null : String(sent.error).slice(0, 500),
    });

    await supabase.from("wa_transaction_events").insert({
      conversation_id: conversationId,
      agent_id: agentId,
      phone_normalized: phone,
      property_id: offerProp.id,
      property_name: offerProp.name,
      property_slug: offerProp.slug,
      property_url: offerProp.url,
      price: offerProp.price,
      event: "offer_followup",
      status: sent.ok ? "sent" : "failed",
      wa_message_id: msgId,
      error: sent.ok ? null : String(sent.error).slice(0, 500),
      source: fromMake ? "make" : "admin",
      payload: { step: "oferta_negociere" },
    });

    await relayToMake("wa_offer_followup", {
      phone,
      property: offerProp,
      conversation_id: conversationId,
      agent_id: agentId,
      delivered: sent.ok,
      wa_message_id: msgId,
      error: sent.ok ? null : String(sent.error),
      message: text,
    });

    return { ok: sent.ok, wa_message_id: msgId };
  };

  // ---------------------------------------------------------- listing_opened
  // Admin / site: clientul a deschis anunțul ales (pentru dashboardul de tranzacții).
  if (action === "listing_opened") {
    const phone = normalizeRoMobile(body.phone || "") || (body.phone || "").trim();
    const propertyId = (body.property_id || "").trim();
    if (!propertyId) return json({ error: "property_id_required" }, 400);
    const { data: prop } = await supabase
      .from("properties")
      .select("id, name, slug")
      .eq("id", propertyId)
      .maybeSingle();
    // Agentul alocat discuției, ca raportul pe agent din dashboard să fie corect.
    let openedAgentId: string | null = null;
    if (body.conversation_id || phone) {
      const q = supabase.from("wa_conversations").select("assigned_agent_id").limit(1);
      const { data: convRow } = body.conversation_id
        ? await q.eq("id", body.conversation_id).maybeSingle()
        : await q.eq("phone_normalized", phone).order("updated_at", { ascending: false }).maybeSingle();
      openedAgentId = (convRow?.assigned_agent_id as string) ?? null;
    }
    await supabase.from("wa_transaction_events").insert({
      conversation_id: body.conversation_id ?? null,
      agent_id: openedAgentId,
      phone_normalized: phone,
      property_id: propertyId,
      property_name: (prop?.name as string) ?? null,
      property_slug: (prop?.slug as string) ?? null,
      property_url: prop?.slug ? `https://realtrust.ro/proprietate/${prop.slug}` : null,
      event: "listing_opened",
      status: "opened",
      source: fromMake ? "make" : "admin",
    });
    await relayToMake("wa_listing_opened", { phone, property_id: propertyId });
    return json({ ok: true });
  }


  // ---------------------------------------------------------------- agent_reply
  if (action === "agent_reply") {
    const phone = normalizeRoMobile(body.phone || "");
    const text = (body.message || "").trim();
    if (!phone) return json({ error: "phone_invalid" }, 400);
    if (!text) return json({ error: "message_required" }, 400);

    // Conversația existentă sau una nouă, ca să rămână un thread complet.
    const { data: conv } = await supabase
      .from("wa_conversations")
      .select("id, window_expires_at, prospect_id, assigned_agent_id")
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

      await logOffer({
        conversationId,
        waMsgId: tplMsgId,
        ok: sentTpl.ok,
        status: sentTpl.ok ? "sent_template" : "failed",
        error: sentTpl.ok ? null : String(sentTpl.error),
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
      await logOffer({
        conversationId,
        ok: false,
        status: "failed",
        error: "outside_24h_window_not_delivered",
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

    const convAgentId = (conv?.assigned_agent_id as string) ?? null;

    await logOffer({
      conversationId,
      waMsgId,
      ok: sent.ok,
      status: sent.ok ? "sent" : "failed",
      error: sent.ok ? null : String(sent.error),
      agentId: convAgentId,
    });

    // Mesajul agentului merge și în Make, ca să apară în discuția live acolo.
    if (!fromMake) {
      await relayToMake("wa_agent_reply", {
        phone,
        conversation_id: conversationId,
        agent_id: convAgentId,
        message: text,
        status: sent.ok ? "sent" : "failed",
        wa_message_id: waMsgId,
        window_open: windowOpen,
        property: offerProp,
      });
    }


    // Apartamentul ales → discuția continuă singură cu pașii următori.
    let followup: { ok: boolean; wa_message_id: string | null } | null = null;
    if (offerProp && sent.ok && body.skip_followup !== true) {
      followup = await sendOfferFollowup(conversationId, phone, convAgentId);
    }

    return json(
      {
        ok: sent.ok,
        conversation_id: conversationId,
        wa_message_id: waMsgId,
        delivered: sent.ok,
        followup_sent: followup?.ok ?? false,
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
    }

    const ctx = await loadProspectContext(supabase, phone);
    if (replyKind === "intake") replyText = buildIntakeMessage(ctx);

    // Backup pe e-mail către agentul alocat, în momentul primirii mesajului.
    const notified = await notifyAgentInbound(supabase, {
      phone,
      profile_name: body.profile_name ?? null,
      message: text,
      conversation_id: convId,
      prospect: ctx,
      first: !outboundCount,
      auto_reply: replyKind === "intake"
        ? "mesaj de calificare"
        : (replyKind === "ack" ? "confirmare (regula de 3 ore)" : "fără răspuns automat (mesaj recent)"),
      meta_response: body.wa_message_id ? `mesaj Meta ${body.wa_message_id}` : null,
    });

    if (replyKind === "skipped_recent_ack") {
      return json({
        ok: true,
        conversation_id: convId,
        auto_reply: "skipped_recent_ack",
        agent: notified.agent,
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
