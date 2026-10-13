// Reminder secundar: lead-urile WhatsApp rămase „Nou / Necontactat” peste 10 minute.
// Rulează din orchestrator la 5 minute; un singur reminder per lead.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { sendTeamEmail } from "../_shared/teamEmail.ts";
import { logLeadEvent } from "../_shared/leadEvents.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-cron-secret",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const denied = await requireInternalOrAdmin(req, corsHeaders);
  if (denied) return denied;
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const now = Date.now();
    const { data: leads, error } = await admin.from("leads")
      .select("id, name, whatsapp_number, email, lead_score, lead_grade, simulation_data, created_at")
      .eq("source", "whatsapp_reply")
      .eq("crm_status", "nou_necontactat")
      .is("uncontacted_reminder_sent_at", null)
      .lte("created_at", new Date(now - 10 * 60_000).toISOString())
      .gte("created_at", new Date(now - 24 * 3600_000).toISOString())
      .limit(20);
    if (error) throw error;
    const teamEmail = Deno.env.get("ADMIN_ALERT_EMAIL") || "info@realtrust.ro";
    const { data: admins } = await admin.from("user_roles").select("user_id").eq("role", "admin");
    let sent = 0;
    for (const l of leads ?? []) {
      // Revendicare atomică — previne dublura la rulări paralele.
      const { data: claimed } = await admin.from("leads")
        .update({ uncontacted_reminder_sent_at: new Date().toISOString() })
        .eq("id", l.id).is("uncontacted_reminder_sent_at", null).eq("crm_status", "nou_necontactat")
        .select("id");
      if (!claimed?.length) continue;
      const sim = (l.simulation_data ?? {}) as Record<string, unknown>;
      const mins = Math.round((now - new Date(l.created_at).getTime()) / 60_000);
      const digits = String(l.whatsapp_number || "").replace(/\D/g, "");
      const html = `<div style="font-family:system-ui,sans-serif;max-width:560px">
        <h2 style="color:#b45309;margin:0 0 8px">⏰ Lead necontactat de ${mins} minute</h2>
        <p><b>${esc(l.name)}</b> · ${esc(l.whatsapp_number)} · scor ${esc(l.lead_score ?? "—")} (${esc(l.lead_grade ?? "-")})</p>
        <p>Cartier: ${esc(sim.zona ?? "—")} · Camere: ${esc(sim.rooms ?? "—")}</p>
        ${sim.last_wa_message ? `<p style="color:#6e7480">Ultimul mesaj primit:</p><blockquote style="margin:0;padding:8px 12px;background:#f1f5f9;border-left:3px solid #25D366;white-space:pre-wrap">${esc(sim.last_wa_message)}</blockquote>` : ""}
        ${digits.length >= 9 ? `<p style="margin:16px 0"><a href="https://wa.me/${digits}" style="background:#25D366;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Deschide chat WhatsApp</a></p>` : ""}
      </div>`;
      const mail = await sendTeamEmail({ to: teamEmail, subject: `⏰ Reminder: ${l.name} încă necontactat (${mins} min)`, html, leadId: l.id, source: "lead-uncontacted-reminder" }, admin);
      const rows = (admins ?? []).map((a: { user_id: string }) => ({
        user_id: a.user_id, type: "warning",
        title: "⏰ Lead WhatsApp necontactat de 10+ minute",
        message: `${l.name} · ${l.whatsapp_number}`.slice(0, 500),
        action_url: "/admin?tab=leads", action_label: "Deschide lead-ul",
      }));
      if (rows.length) await admin.from("user_notifications").insert(rows);
      await logLeadEvent({ leadId: l.id, type: "uncontacted_reminder", status: mail.sent ? "success" : "warning",
        message: `Reminder secundar după ${mins} min (${mail.sent ? "e-mail trimis" : mail.error ?? "e-mail eșuat"})`,
        actor: "lead-uncontacted-reminder" }, admin);
      sent++;
    }
    return json({ ok: true, checked: leads?.length ?? 0, reminded: sent });
  } catch (e) {
    console.error("lead-uncontacted-reminder:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
