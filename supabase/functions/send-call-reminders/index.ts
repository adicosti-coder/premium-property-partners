// Cron (every 15 min): sends a reminder email ~2h before each scheduled owner call.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { isInternalCall } from "../_shared/cronAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret, x-webhook-secret",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const escapeHtml = (v: unknown) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string),
  );

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!(await isInternalCall(req))) return json({ error: "unauthorized" }, 401);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  const now = Date.now();
  const from = new Date(now + 105 * 60 * 1000).toISOString(); // 1h45m
  const to = new Date(now + 135 * 60 * 1000).toISOString(); // 2h15m

  const { data: appointments, error } = await supabase
    .from("chatbot_appointments")
    .select("id, contact_name, contact_email, contact_phone, preferred_date, preferred_time_slot, status")
    .eq("appointment_type", "call_15min_proprietar")
    .in("status", ["pending", "confirmed"])
    .is("reminder_sent_at", null)
    .gte("preferred_date", from)
    .lte("preferred_date", to);

  if (error) {
    console.error("send-call-reminders query failed:", error.message);
    return json({ error: "query_failed" }, 500);
  }

  let sent = 0;
  for (const appt of appointments ?? []) {
    if (!appt.contact_email || !resendApiKey) {
      // Mark as handled so we don't re-scan the same rows every 15 minutes.
      await supabase.from("chatbot_appointments").update({ reminder_sent_at: new Date().toISOString() }).eq("id", appt.id);
      continue;
    }

    const slot = appt.preferred_time_slot ?? "";
    const html = `<!DOCTYPE html><html lang="ro"><head><meta charset="UTF-8"></head>
<body style="margin:0;background:#fff;font-family:'Segoe UI',Roboto,Arial,sans-serif;color:#1f2937;">
<div style="max-width:600px;margin:0 auto;padding:36px 24px;">
  <h1 style="font-family:Georgia,serif;font-size:22px;color:#1a1f36;margin:0 0 12px;">Reminder: te sunăm în 2 ore</h1>
  <p style="font-size:15px;line-height:1.6;">Bună ${escapeHtml(appt.contact_name)},</p>
  <p style="font-size:15px;line-height:1.6;">
    Îți amintim de apelul de 15 minute programat astăzi la ora <strong>${escapeHtml(slot)}</strong> (ora României),
    pe numărul ${escapeHtml(appt.contact_phone)}.
  </p>
  <p style="font-size:15px;line-height:1.6;">
    Pregătește zona apartamentului, numărul de camere, suprafața și dacă este mobilat — cu asta putem calcula estimarea de venit pe loc.
  </p>
  <p style="font-size:14px;color:#6b7280;line-height:1.6;">
    Nu mai poți vorbi? Scrie-ne pe WhatsApp la <a href="https://wa.me/40799069256">0799 069 256</a> și mutăm apelul.
  </p>
  <p style="font-size:13px;color:#9ca3af;">RealTrust Timișoara · realtrust.ro</p>
</div></body></html>`;

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "RealTrust <contact@realtrust.ro>",
          to: [appt.contact_email],
          subject: `⏰ Reminder: apelul RealTrust la ora ${slot}`,
          html,
        }),
      });
      if (!res.ok) console.error("reminder email failed:", await res.text());
      else sent++;
    } catch (e) {
      console.error("reminder email error:", (e as Error).message);
    }

    await supabase.from("chatbot_appointments").update({ reminder_sent_at: new Date().toISOString() }).eq("id", appt.id);
  }

  return json({ success: true, checked: appointments?.length ?? 0, sent });
});
