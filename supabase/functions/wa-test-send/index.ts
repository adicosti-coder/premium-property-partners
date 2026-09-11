// wa-test-send — trimite un mesaj de test WhatsApp de pe numărul Meta configurat
// către un număr real, ca să validăm end-to-end tokenul, Phone Number ID-ul și
// șablonul aprobat. Internal-only (service role / cron secret).
//
// Mesajul și răspunsul Meta se salvează în wa_conversations / wa_messages,
// deci apar imediat în Admin → Istoric WhatsApp.
import { createClient } from "npm:@supabase/supabase-js@2";
import { isInternalCall } from "../_shared/cronAuth.ts";

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

/** Normalizează un număr românesc la format E.164 (+40…). */
function normalizeRo(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  if (/^\+40\d{9}$/.test(digits)) return digits;
  if (/^40\d{9}$/.test(digits)) return `+${digits}`;
  if (/^0\d{9}$/.test(digits)) return `+4${digits}`;
  if (/^7\d{8}$/.test(digits)) return `+40${digits}`;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!(await isInternalCall(req))) return json({ error: "Unauthorized" }, 401);

  const token = Deno.env.get("WHATSAPP_ACCESS_TOKEN") || "";
  const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "";
  if (!token || !phoneId) return json({ error: "missing_credentials" }, 500);

  let body: {
    to?: string;
    text?: string;
    template_name?: string;
    template_language?: string;
    template_params?: string[];
  } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const to = normalizeRo(String(body.to ?? ""));
  if (!to) return json({ error: "invalid_phone", detail: "Format acceptat: 07xxxxxxxx sau +407xxxxxxxx" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Conversație dedicată testului (una per număr).
  const { data: existing } = await supabase
    .from("wa_conversations")
    .select("id")
    .eq("phone_normalized", to)
    .maybeSingle();

  let conversationId = existing?.id as string | undefined;
  if (!conversationId) {
    const { data: created, error: convErr } = await supabase
      .from("wa_conversations")
      .insert({ phone_normalized: to, status: "active" })
      .select("id")
      .single();
    if (convErr) return json({ error: "conversation_create_failed", detail: convErr.message }, 500);
    conversationId = created.id;
  }

  const useTemplate = !!body.template_name;
  const graphBody = useTemplate
    ? {
        messaging_product: "whatsapp",
        to: to.replace(/^\+/, ""),
        type: "template",
        template: {
          name: body.template_name,
          language: { code: body.template_language || "en_US" },
          ...(body.template_params?.length
            ? {
                components: [
                  {
                    type: "body",
                    parameters: body.template_params.map((p) => ({ type: "text", text: p })),
                  },
                ],
              }
            : {}),
        },
      }
    : {
        messaging_product: "whatsapp",
        to: to.replace(/^\+/, ""),
        type: "text",
        text: { preview_url: false, body: body.text || "Mesaj de test RealTrust." },
      };

  const resp = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(graphBody),
  });
  const metaBody = await resp.json().catch(() => ({}));

  await supabase.from("wa_messages").insert({
    conversation_id: conversationId,
    direction: "outbound",
    role: "system",
    content: useTemplate
      ? `[template:${body.template_name}] ${(body.template_params ?? []).join(" | ")}`
      : body.text || "Mesaj de test RealTrust.",
    error: resp.ok ? null : metaBody?.error?.message ?? `meta_${resp.status}`,
  });

  if (!resp.ok) {
    console.error(`[wa-test-send] Meta ${resp.status}:`, JSON.stringify(metaBody));
    return json(
      {
        ok: false,
        status: resp.status,
        to,
        conversation_id: conversationId,
        meta_error: metaBody?.error ?? metaBody,
      },
      resp.status,
    );
  }

  return json({ ok: true, to, conversation_id: conversationId, meta: metaBody });
});
