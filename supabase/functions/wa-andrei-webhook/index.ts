// wa-andrei-webhook — Meta WhatsApp Cloud API webhook (verify + inbound).
// Public endpoint (verify_jwt = false). Validates signature via WHATSAPP_APP_SECRET.
import { createClient } from "npm:@supabase/supabase-js@2";

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

  if (appSecret) {
    const ok = await verifySignature(rawBody, sigHeader, appSecret);
    if (!ok) {
      console.warn("[wa-webhook] invalid signature");
      return new Response("Forbidden", { status: 403 });
    }
  } else {
    console.warn("[wa-webhook] WHATSAPP_APP_SECRET missing — skipping signature check (INSECURE)");
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
              .select("id").eq("phone", from).limit(1).maybeSingle();
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

        conversationsToReply.add(convId);
      }
    }
  }

  // Fire-and-forget replies (must return 200 to Meta < 20s)
  for (const convId of conversationsToReply) {
    fetch(`${supabaseUrl}/functions/v1/wa-andrei-reply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
        "x-internal-secret": internalSecret,
      },
      body: JSON.stringify({ conversation_id: convId }),
    }).catch((e) => console.error("[wa-webhook] reply invoke failed:", e));
  }

  return new Response("EVENT_RECEIVED", { status: 200 });
});
