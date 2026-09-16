// wa-andrei-webhook — Meta WhatsApp Cloud API webhook (verify + inbound).
// Public endpoint (verify_jwt = false). Validates signature via WHATSAPP_APP_SECRET.
import { createClient } from "npm:@supabase/supabase-js@2";
import { relayToMake } from "../_shared/makeRelay.ts";
import { ACK_MESSAGE, buildIntakeMessage, loadProspectContext, autoReplyText } from "../_shared/waAutoReply.ts";
import { notifyClientChatLink } from "../_shared/waClientEmail.ts";
import { notifyAgentInbound } from "../_shared/waAgentNotify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-hub-signature-256",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function normalizeRoPhone(raw: string): string {
  let c = (raw || "").replace(/[^\d+]/g, "");
  if (!c) return "";
  if (c.startsWith("+")) return c;
  return `+${c}`;
}

async function verifySignature(rawBody: string, sigHeader: string, appSecret: string): Promise<boolean> {
  if (!sigHeader || !sigHeader.startsWith("sha256=")) return false;
  const expected = sigHeader.slice("sha256=".length);
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const hex = Array.from(new Uint8Array(sigBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hex.length !== expected.length) return false;
  let r = 0;
  for (let i = 0; i < hex.length; i++) r |= hex.charCodeAt(i) ^ expected.charCodeAt(i);
  return r === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // ── GET: Meta subscription challenge ─────────────
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const verifyToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "";
    if (mode === "subscribe" && token && verifyToken && token === verifyToken) {
      return new Response(challenge || "", { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  // ── POST: signature check ─────────────
  const rawBody = await req.text();
  const appSecret = Deno.env.get("WHATSAPP_APP_SECRET") || "";
  const sigHeader = req.headers.get("x-hub-signature-256") || "";

  // Fail closed: without the signing secret we cannot prove the payload came
  // from Meta, so we reject instead of processing forged messages/leads.
  if (!appSecret) {
    console.error("[wa-webhook] WHATSAPP_APP_SECRET missing — rejecting request (fail-closed)");
    return new Response("Webhook not configured", { status: 503 });
  }
  const ok = await verifySignature(rawBody, sigHeader, appSecret);
  if (!ok) {
    console.warn("[wa-webhook] invalid signature");
    return new Response("Forbidden", { status: 403 });
  }

  let payload: any;
  try { payload = JSON.parse(rawBody); } catch { return new Response("Bad JSON", { status: 400 }); }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const internalSecret = Deno.env.get("WA_ANDREI_INTERNAL_SECRET") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const entries = payload?.entry || [];
  const conversationsToReply = new Set<string>();
  // convId → telefon, ca mesajul de calificare să fie personalizat cu datele anunțului.
  const intakeConversations = new Map<string, string>();
  const quickReplyConversations = new Map<string, { phone: string; kind: string; text: string }>();

  for (const entry of entries) {
    for (const change of entry?.changes || []) {
      const value = change?.value;
      const messages = value?.messages || [];
      const contacts = value?.contacts || [];
      const profileName = contacts?.[0]?.profile?.name || null;

      for (const msg of messages) {
        const waId = msg.id;
        const from = normalizeRoPhone(msg.from);
        const type = msg.type;
        if (!from || !waId) continue;

        // Extract text
        let text = "";
        let mediaUrl: string | null = null;
        if (type === "text") text = msg.text?.body || "";
        else if (type === "button") text = msg.button?.text || "";
        else if (type === "interactive") text = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || "";
        else if (["image", "audio", "video", "document"].includes(type)) {
          text = `[${type} primit]`;
          mediaUrl = msg[type]?.id ? `wa-media://${msg[type].id}` : null;
        } else {
          text = `[${type}]`;
        }

        // Upsert conversation
        const nowIso = new Date().toISOString();
        const windowExp = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

        const { data: existing } = await supabase.from("wa_conversations")
          .select("id, prospect_id").eq("phone_normalized", from).maybeSingle();

        let convId: string;
        if (existing) {
          convId = existing.id;
          await supabase.from("wa_conversations").update({
            last_inbound_at: nowIso,
            window_expires_at: windowExp,
            wa_profile_name: profileName,
          }).eq("id", convId);
        } else {
          // Try to link a prospect by phone (best-effort)
          let prospectId: string | null = null;
          try {
            const { data: prospect } = await supabase.from("prospect_listings")
              .select("id").eq("phone_normalized", from).limit(1).maybeSingle();
            prospectId = prospect?.id || null;
          } catch {}

          const { data: inserted, error: insErr } = await supabase.from("wa_conversations").insert({
            phone_normalized: from,
            prospect_id: prospectId,
            wa_profile_name: profileName,
            last_inbound_at: nowIso,
            window_expires_at: windowExp,
          }).select("id").single();

          if (insErr || !inserted) {
            console.error("[wa-webhook] conv insert failed:", insErr);
            continue;
          }
          convId = inserted.id;
        }

        // Insert message (idempotent via unique wa_message_id)
        const { error: msgErr } = await supabase.from("wa_messages").insert({
          conversation_id: convId,
          wa_message_id: waId,
          direction: "inbound",
          role: "user",
          content: text,
          media_url: mediaUrl,
        });

        if (msgErr) {
          // Duplicate → already processed
          if ((msgErr as any).code === "23505") continue;
          console.error("[wa-webhook] msg insert failed:", msgErr);
          continue;
        }

        // Fiecare mesaj primit (nu doar primul răspuns) merge în Make, ca agentul
        // să vadă conversația completă. Mesajul e deja salvat în Admin (wa_messages).
        const inboundRelay = await relayToMake("wa_inbound_message", {
          conversation_id: convId,
          phone: from,
          profile_name: profileName,
          wa_message_id: waId,
          message_type: type,
          message: text,
          media_url: mediaUrl,
          received_at: new Date().toISOString(),
        });
        try {
          await supabase.from("make_lead_events").insert({
            direction: "inbound",
            event: "wa_inbound_message",
            conversation_id: convId,
            phone_normalized: from,
            message: text,
            wa_message_id: waId,
            status: inboundRelay.ok
              ? "sent"
              : (inboundRelay.skipped ? "make_not_configured" : "failed"),
            error: inboundRelay.ok
              ? null
              : (inboundRelay.error || String(inboundRelay.skipped ?? "make_failed")),
            payload: { profile_name: profileName, message_type: type, relay: inboundRelay },
          });
        } catch (e) {
          console.error("[wa-webhook] make_lead_events insert failed:", e);
        }

        // Backup în timp real pe e-mail, către agentul alocat conversației.
        try {
          const { count: inboundCount } = await supabase
            .from("wa_messages")
            .select("id", { count: "exact", head: true })
            .eq("conversation_id", convId)
            .eq("direction", "inbound");
          const ctxForEmail = await loadProspectContext(supabase, from);
          await notifyAgentInbound(supabase, {
            phone: from,
            profile_name: profileName,
            message: text,
            conversation_id: convId,
            prospect: ctxForEmail,
            first: (inboundCount ?? 1) <= 1,
            meta_response: waId ? `mesaj Meta ${waId}` : null,
          });
        } catch (e) {
          console.error("[wa-webhook] agent email backup failed:", e);
        }

        // Prima interacțiune → mesaj standard de calificare (imobiliare / administrare / rezervare),
        // ca nicio conversație să nu rămână fără răspuns. Apoi preia agentul AI.
        const { count: outboundCount } = await supabase
          .from("wa_messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", convId)
          .eq("direction", "outbound");

        let quick = outboundCount ? autoReplyText(text) : null;
        // Nu repetăm același răspuns automat la fiecare mesaj: dacă exact acest
        // răspuns a plecat în ultimele 6 ore, lăsăm discuția pe mâna agentului.
        if (quick && quick.kind !== "quick_no" && quick.kind !== "quick_stop") {
          try {
            const sixHoursAgo = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
            const { count: repeated } = await supabase
              .from("wa_messages")
              .select("id", { count: "exact", head: true })
              .eq("conversation_id", convId)
              .eq("direction", "outbound")
              .gte("created_at", sixHoursAgo)
              .contains("tool_call", { auto_reply: quick.kind });
            if (repeated) quick = null;
          } catch (e) {
            console.error("[wa-webhook] auto-reply dedupe check failed:", e);
          }
        }
        if (quick) {
          // Răspuns la butoanele din primul mesaj → trimitem imediat răspunsul
          // potrivit, independent de regula de 3 ore, ca discuția să continue.
          quickReplyConversations.set(convId, { phone: from, ...quick });
        } else if (!outboundCount) {
          intakeConversations.set(convId, from);
        } else {
          conversationsToReply.add(convId);
        }

        // Linkul chatului, o singură dată, către clientul cu e-mail cunoscut.
        try {
          await notifyClientChatLink(supabase, { phone: from, conversation_id: convId });
        } catch (e) {
          console.error("[wa-webhook] client chat link email failed:", e);
        }


        // Marchează în coada outbound primul răspuns primit de la acest număr
        // și transformă răspunsul în lead (salvat în Admin + trimis în Make.com).
        try {
          const { data: pendingReply } = await supabase
            .from("wa_outbound_queue")
            .select("id, template_name, prospect_listing_id, source")
            .eq("phone_normalized", from)
            .in("status", ["sent"])
            .is("replied_at", null)
            .order("sent_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (pendingReply?.id) {
            await supabase
              .from("wa_outbound_queue")
              .update({ status: "replied", replied_at: nowIso })
              .eq("id", pendingReply.id);

            // Lead din răspunsul la șablonul de prim contact
            const { data: existingLead } = await supabase
              .from("leads")
              .select("id")
              .eq("whatsapp_number", from)
              .eq("source", "whatsapp_reply")
              .limit(1)
              .maybeSingle();

            let leadId: string | null = existingLead?.id ?? null;

            if (!leadId) {
              let area = 0;
              let propType = "necunoscut";
              if (pendingReply.prospect_listing_id) {
                const { data: pl } = await supabase
                  .from("prospect_listings")
                  .select("size, rooms, prospect_type, contact_name")
                  .eq("id", pendingReply.prospect_listing_id)
                  .maybeSingle();
                area = Number(pl?.size ?? 0) || 0;
                propType = pl?.prospect_type
                  ? String(pl.prospect_type)
                  : (pl?.rooms ? `${pl.rooms} camere` : "necunoscut");
              }
              const { data: newLead, error: leadErr } = await supabase
                .from("leads")
                .insert({
                  name: profileName || `Client WhatsApp ${from}`,
                  whatsapp_number: from,
                  source: "whatsapp_reply",
                  message: text,
                  property_area: area,
                  property_type: propType,
                })
                .select("id")
                .maybeSingle();
              if (leadErr) console.error("[wa-webhook] lead insert failed:", leadErr);
              leadId = newLead?.id ?? null;
            }

            if (leadId) {
              await supabase.from("wa_outbound_queue")
                .update({ lead_id: leadId })
                .eq("id", pendingReply.id);
            }

            // Actualizează starea prospectului în Admin: a răspuns → interesat
            if (pendingReply.prospect_listing_id) {
              const { error: plErr } = await supabase
                .from("prospect_listings")
                .update({ lifecycle_status: "interested" })
                .eq("id", pendingReply.prospect_listing_id)
                .in("lifecycle_status", ["new", "scoring", "calling", "callback", "to_review"]);
              if (plErr) console.error("[wa-webhook] prospect status update failed:", plErr);
            }

            const relay = await relayToMake("wa_inbound_lead", {
              lead_id: leadId,
              queue_id: pendingReply.id,
              template_name: pendingReply.template_name,
              prospect_listing_id: pendingReply.prospect_listing_id,
              phone: from,
              profile_name: profileName,
              conversation_id: convId,
              reply_text: text,
              replied_at: nowIso,
            });

            // Backupul pe e-mail către agent a plecat deja la primirea mesajului.


            // Jurnal pentru tabul „Lead-uri Make” din Admin.
            await supabase.from("make_lead_events").insert({
              direction: "outbound",
              event: "wa_inbound_lead",
              lead_id: leadId,
              prospect_listing_id: pendingReply.prospect_listing_id,
              conversation_id: convId,
              phone_normalized: from,
              message: text,
              status: relay.ok ? "sent" : (relay.skipped ? "make_not_configured" : "failed"),
              error: relay.ok ? null : (relay.error || relay.skipped || "make_failed"),
              payload: {
                queue_id: pendingReply.id,
                template_name: pendingReply.template_name,
                profile_name: profileName,
                relay,
              },
            });
          }

        } catch (e) {
          console.error("[wa-webhook] queue reply mark failed:", e);
        }
      }

      // ── Status callbacks (sent / delivered / read / failed) ────────────────
      for (const st of value?.statuses || []) {
        const waId = st?.id;
        const state = String(st?.status || "");
        if (!waId || !state) continue;
        const tsIso = st?.timestamp
          ? new Date(Number(st.timestamp) * 1000).toISOString()
          : new Date().toISOString();

        const patch: Record<string, unknown> = {};
        if (state === "delivered") patch.delivered_at = tsIso;
        else if (state === "read") patch.read_at = tsIso;
        else if (state === "failed") {
          patch.status = "failed";
          patch.last_error = `meta_status_failed: ${JSON.stringify(st?.errors ?? {}).slice(0, 400)}`;
        }
        if (!Object.keys(patch).length) continue;

        // Un eșec raportat de Meta nu trebuie să șteargă starea „replied”
        // (clientul a răspuns deja) — altfel lead-ul dispare din rapoarte.
        let stUpdate = supabase
          .from("wa_outbound_queue")
          .update(patch)
          .eq("wa_message_id", waId);
        if (state === "failed") stUpdate = stUpdate.in("status", ["pending", "sending", "sent"]);
        const { error: qErr } = await stUpdate;
        if (qErr) console.error("[wa-webhook] status update failed:", qErr);

        // Aceeași confirmare se salvează și pe mesaj, ca să vedem în Admin
        // starea reală (trimis / livrat / citit) pentru fiecare mesaj trimis,
        // nu doar pentru cele plecate din coadă.
        const msgPatch: Record<string, unknown> = { delivery_status: state };
        if (state === "delivered") msgPatch.delivered_at = tsIso;
        if (state === "read") { msgPatch.read_at = tsIso; msgPatch.delivered_at = tsIso; }
        if (state === "failed") {
          msgPatch.error = `meta_status_failed: ${JSON.stringify(st?.errors ?? {}).slice(0, 400)}`;
        }
        const { error: mErr } = await supabase
          .from("wa_messages")
          .update(msgPatch)
          .eq("wa_message_id", waId);
        if (mErr) console.error("[wa-webhook] message status update failed:", mErr);
      }
    }
  }


  /** Numerele care au cerut să nu mai fie contactate nu primesc mesaje automate. */
  const isBlockedConv = async (convId: string): Promise<boolean> => {
    try {
      const { data: c } = await supabase
        .from("wa_conversations").select("phone_normalized").eq("id", convId).maybeSingle();
      if (!c?.phone_normalized) return false;
      const { data: d } = await supabase
        .from("wa_dnc_list").select("id").eq("phone_normalized", c.phone_normalized).maybeSingle();
      return !!d;
    } catch {
      return false;
    }
  };

  // Răspuns automat la butoanele din primul mesaj (vânzare / administrare / refuz).
  for (const [convId, quick] of quickReplyConversations) {
    if (quick.kind === "quick_no" || quick.kind === "quick_stop") {
      try {
        await supabase.from("wa_dnc_list").upsert({
          phone_normalized: quick.phone,
          label: "refuz expres",
          reason: "clientul a refuzat expres pe WhatsApp (buton „Nu, mulțumesc” sau STOP)",
        }, { onConflict: "phone_normalized" });
      } catch (e) {
        console.error("[wa-webhook] dnc upsert failed:", e);
      }
    } else if (await isBlockedConv(convId)) {
      continue; // număr în lista de excludere → răspunde doar un coleg
    }
    fetch(`${supabaseUrl}/functions/v1/wa-andrei-send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
        "x-internal-secret": internalSecret,
      },
      body: JSON.stringify({ conversation_id: convId, text: quick.text, auto_kind: quick.kind }),
    }).catch((e) => console.error("[wa-webhook] quick reply send failed:", e));
  }

  // Auto-reply de calificare la prima interacțiune (fire-and-forget)
  for (const [convId, convPhone] of intakeConversations) {
    if (await isBlockedConv(convId)) continue;
    const ctx = await loadProspectContext(supabase, convPhone);
    fetch(`${supabaseUrl}/functions/v1/wa-andrei-send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
        "x-internal-secret": internalSecret,
      },
      body: JSON.stringify({ conversation_id: convId, text: buildIntakeMessage(ctx), auto_kind: "intake" }),
    }).catch((e) => console.error("[wa-webhook] intake send failed:", e));
  }

  // Mesajele următoare: dacă agentul AI e activ, răspunde el. Dacă e oprit,
  // trimitem o confirmare automată, ca niciun client să nu rămână fără răspuns
  // până intervine un coleg (o singură confirmare la 3 ore per conversație).
  const { data: agentSettings } = await supabase
    .from("wa_agent_settings")
    .select("enabled")
    .eq("id", 1)
    .maybeSingle();
  const agentEnabled = !!agentSettings?.enabled;


  for (const convId of conversationsToReply) {
    if (agentEnabled) {
      fetch(`${supabaseUrl}/functions/v1/wa-andrei-reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceKey}`,
          "x-internal-secret": internalSecret,
        },
        body: JSON.stringify({ conversation_id: convId }),
      }).catch((e) => console.error("[wa-webhook] reply invoke failed:", e));
      continue;
    }

    try {
      const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
      const { count: recentAck } = await supabase
        .from("wa_messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", convId)
        .eq("direction", "outbound")
        .gte("created_at", threeHoursAgo);
      if (recentAck) continue;
      if (await isBlockedConv(convId)) continue;

      fetch(`${supabaseUrl}/functions/v1/wa-andrei-send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceKey}`,
          "x-internal-secret": internalSecret,
        },
        body: JSON.stringify({ conversation_id: convId, text: ACK_MESSAGE, auto_kind: "ack" }),
      }).catch((e) => console.error("[wa-webhook] ack send failed:", e));
    } catch (e) {
      console.error("[wa-webhook] ack check failed:", e);
    }
  }


  return new Response("EVENT_RECEIVED", { status: 200 });
});
