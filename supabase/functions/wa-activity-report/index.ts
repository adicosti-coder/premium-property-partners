// wa-activity-report — raportul de activitate WhatsApp (mesaje trimise, primite,
// răspunsuri automate) și trimiterea lui pe WhatsApp către un număr al echipei.
// Acces: doar apel intern (cron) sau administrator autentificat.
import { createClient } from "npm:@supabase/supabase-js@2";
import { WA_PHONE_NUMBER_ID } from "../_shared/waConfig.ts";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, content-type, x-webhook-secret, x-cron-secret, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type Msg = {
  direction: string;
  error: string | null;
  tool_call: Record<string, unknown> | null;
  created_at: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const gate = await requireInternalOrAdmin(req, corsHeaders);
  if (gate) return gate;

  let body: { hours?: number; to?: string; send?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const hours = Math.min(Math.max(Number(body.hours) || 24, 1), 720);
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const [msgRes, autoRes, convRes] = await Promise.all([
    supabase
      .from("wa_messages")
      .select("direction, error, tool_call, created_at")
      .gte("created_at", since)
      .limit(5000),
    supabase
      .from("make_lead_events")
      .select("event, created_at")
      .like("event", "wa_auto%")
      .gte("created_at", since)
      .limit(5000),
    supabase
      .from("wa_conversations")
      .select("id, phone_normalized")
      .gte("last_inbound_at", since)
      .limit(2000),
  ]);

  const msgs = (msgRes.data ?? []) as Msg[];
  const inbound = msgs.filter((m) => m.direction === "inbound").length;
  const outbound = msgs.filter((m) => m.direction === "outbound");
  const sent = outbound.filter((m) => !m.error).length;
  const failed = outbound.length - sent;
  const taggedAuto = outbound.filter((m) => m.tool_call && (m.tool_call as any).auto_reply).length;
  const autoReplies = Math.max(taggedAuto, (autoRes.data ?? []).length);
  const conversations = (convRes.data ?? []).length;

  const stats = {
    hours,
    conversations,
    inbound,
    sent,
    failed,
    auto_replies: autoReplies,
    agent_replies: Math.max(sent - autoReplies, 0),
  };

  const label = hours === 24 ? "ultimele 24 de ore" : `ultimele ${hours} ore`;
  const text = [
    `📊 Raport WhatsApp RealTrust — ${label}`,
    "",
    `• Mesaje primite de la clienți: ${stats.inbound}`,
    `• Mesaje trimise: ${stats.sent}`,
    `• Răspunsuri automate: ${stats.auto_replies}`,
    `• Răspunsuri de la agenți: ${stats.agent_replies}`,
    `• Discuții active: ${stats.conversations}`,
    ...(stats.failed ? [`• Mesaje eșuate: ${stats.failed}`] : []),
  ].join("\n");

  if (body.send === false) return json({ ok: true, stats, text, delivered: false });

  const to = String(body.to ?? "").replace(/[^\d]/g, "");
  if (!to) return json({ ok: true, stats, text, delivered: false, note: "no_recipient" });

  const accessToken =
    Deno.env.get("META_PERMANENT_TOKEN") || Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  if (!accessToken || !WA_PHONE_NUMBER_ID) {
    return json({ error: "WhatsApp credentials not configured" }, 500);
  }

  const waResp = await fetch(
    `https://graph.facebook.com/v25.0/${WA_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { preview_url: false, body: text },
      }),
    },
  );
  const waBody = await waResp.text();
  if (!waResp.ok) {
    console.error(`[wa-activity-report] Meta send failed [${waResp.status}]: ${waBody}`);
    return json(
      { ok: false, stats, text, delivered: false, status: waResp.status, details: waBody },
      waResp.status,
    );
  }

  let waJson: any = {};
  try {
    waJson = JSON.parse(waBody);
  } catch { /* ignore */ }
  const waMsgId = waJson?.messages?.[0]?.id ?? null;

  // Salvăm raportul în firul discuției, dacă numărul are deja o conversație.
  const conv = (convRes.data ?? []).find(
    (c: any) => String(c.phone_normalized).replace(/[^\d]/g, "") === to,
  );
  if (conv) {
    await supabase.from("wa_messages").insert({
      conversation_id: (conv as any).id,
      wa_message_id: waMsgId,
      direction: "outbound",
      role: "system",
      content: text,
      tool_call: { auto_reply: "activity_report" },
    });
  }

  return json({ ok: true, stats, text, delivered: true, wa_message_id: waMsgId });
});
