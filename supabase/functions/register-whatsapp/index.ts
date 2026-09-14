// register-whatsapp — înregistrează numărul în Meta WhatsApp Cloud API (pas 1)
// și, dacă înregistrarea reușește, trimite un mesaj de test cu template-ul
// hello_world (pas 2). Admin-only sau apel intern.
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";

const PHONE_NUMBER_ID = "1357718887419757";
const WABA_ID = "1734901587779217";
const API_VERSION = "v25.0";
const PIN = "654321";
const TEST_RECIPIENT = "+40723154520";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-cron-secret",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const denied = await requireInternalOrAdmin(req, corsHeaders);
  if (denied) return denied;

  const token =
    Deno.env.get("META_PERMANENT_TOKEN") || Deno.env.get("WHATSAPP_ACCESS_TOKEN") || "";
  if (!token) {
    return json(
      { ok: false, step: "config", error: "missing_token", detail: "META_PERMANENT_TOKEN nu este configurat." },
      500,
    );
  }

  const base = `https://graph.facebook.com/${API_VERSION}`;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  // Pas 1 — înregistrarea numărului
  const regRes = await fetch(`${base}/${PHONE_NUMBER_ID}/register`, {
    method: "POST",
    headers,
    body: JSON.stringify({ messaging_product: "whatsapp", pin: PIN }),
  });
  const regBody = await regRes.json().catch(() => ({}));

  if (!regRes.ok) {
    console.error(`[register-whatsapp] register ${regRes.status}:`, JSON.stringify(regBody));
    return json(
      {
        ok: false,
        step: "register",
        waba_id: WABA_ID,
        phone_number_id: PHONE_NUMBER_ID,
        register: { status: regRes.status, response: regBody },
      },
      200,
    );
  }

  // Pas 2 — mesaj de test: template hello_world / en_US, cu fallback pe text
  // simplu (multe conturi noi nu au template-ul hello_world aprobat).
  const send = (payload: Record<string, unknown>) =>
    fetch(`${base}/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({ messaging_product: "whatsapp", to: TEST_RECIPIENT.replace(/^\+/, ""), ...payload }),
    });

  let msgRes = await send({ type: "template", template: { name: "hello_world", language: { code: "en_US" } } });
  let msgBody = await msgRes.json().catch(() => ({}));

  if (!msgRes.ok && (msgBody as any)?.error?.code === 132001) {
    msgRes = await send({
      type: "text",
      text: { preview_url: false, body: "Test RealTrust: numărul WhatsApp este înregistrat și activ." },
    });
    msgBody = await msgRes.json().catch(() => ({}));
  }

  if (!msgRes.ok) {
    console.error(`[register-whatsapp] test message ${msgRes.status}:`, JSON.stringify(msgBody));
  }

  return json({
    ok: msgRes.ok,
    step: msgRes.ok ? "done" : "test_message",
    waba_id: WABA_ID,
    phone_number_id: PHONE_NUMBER_ID,
    register: { status: regRes.status, response: regBody },
    test_message: { status: msgRes.status, to: TEST_RECIPIENT, response: msgBody },
  });
});
