// crm-lead-sync
// Fired by a DB trigger on every INSERT into public.leads.
//
// 1. Normalises the lead (name, phone, email, neighbourhood, UTMs, score) and
//    forwards it to the CRM webhook (Make.com / external CRM) with the initial
//    status "Nou / Necontactat".
// 2. Sends an instant email alert to the team containing a one-click
//    https://wa.me/... link to start the WhatsApp chat with the owner.
// 3. Writes the sync outcome back on the lead row (crm_status / crm_synced_at /
//    crm_sync_error) so the Admin UI can show and retry failures.
//
// Internal-only: authenticated with the vault cron secret or the service role key.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isInternalCall } from "../_shared/cronAuth.ts";
import { fetchWithRetry } from "../_shared/fetchRetry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-cron-secret",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const escapeHtml = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );

const SENTINELS = new Set(["-", "0", "pending", "n/a", "PRECALC_NO_PHONE"]);

const digits = (p: string) => (p || "").replace(/[^\d]/g, "");

interface LeadRecord {
  id: string;
  name: string;
  email?: string | null;
  whatsapp_number: string;
  property_type?: string | null;
  property_area?: number | null;
  message?: string | null;
  source?: string | null;
  lead_score?: number | null;
  lead_grade?: string | null;
  calculated_net_profit?: number | null;
  created_at: string;
  simulation_data?: Record<string, unknown> | string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (!(await isInternalCall(req))) return json({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    const payload = await req.json();
    const record: LeadRecord = payload.record ?? payload;
    if (!record?.id) return json({ error: "Missing lead record" }, 400);

    const sim = (typeof record.simulation_data === "string"
      ? JSON.parse(record.simulation_data || "{}")
      : record.simulation_data ?? {}) as Record<string, unknown>;

    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 200) : null);

    const phoneRaw = (record.whatsapp_number || "").trim();
    const phoneValid = !SENTINELS.has(phoneRaw) && digits(phoneRaw).length >= 9;
    const waLink = phoneValid ? `https://wa.me/${digits(phoneRaw)}` : null;

    const utm = {
      utm_source: str(sim.utm_source) ?? str((sim.attribution as Record<string, unknown>)?.utm_source),
      utm_medium: str(sim.utm_medium) ?? str((sim.attribution as Record<string, unknown>)?.utm_medium),
      utm_campaign: str(sim.utm_campaign) ?? str((sim.attribution as Record<string, unknown>)?.utm_campaign),
      utm_term: str(sim.utm_term),
      utm_content: str(sim.utm_content),
      referrer: str(sim.referrer) ?? str(sim.landing_referrer),
      landing_page: str(sim.landing_page),
      gclid: str(sim.gclid),
      fbclid: str(sim.fbclid),
    };

    const crmPayload = {
      event: "new_lead",
      timestamp: new Date().toISOString(),
      status: "Nou / Necontactat",
      status_code: "nou_necontactat",
      lead: {
        id: record.id,
        name: record.name,
        phone: phoneValid ? phoneRaw : null,
        phone_valid: phoneValid,
        whatsapp_link: waLink,
        email: record.email ?? null,
        neighbourhood: str(sim.zone_label) ?? str(sim.zona) ?? str(sim.zone) ?? null,
        rooms: str(sim.rooms) ?? str(sim.camere) ?? null,
        property_type: record.property_type ?? null,
        property_area: record.property_area ?? null,
        message: record.message ?? null,
        source: record.source ?? "website",
        lead_score: record.lead_score ?? null,
        lead_grade: record.lead_grade ?? null,
        estimated_net_profit: record.calculated_net_profit ?? null,
        created_at: record.created_at,
      },
      attribution: utm,
    };

    // ---- 1. CRM webhook -----------------------------------------------------
    const crmUrl = Deno.env.get("CRM_WEBHOOK_URL")
      || Deno.env.get("MAKE_WEBHOOK_URL")
      || Deno.env.get("LEAD_WEBHOOK_URL");

    let crmStatus: "synced" | "skipped" | "failed" = "skipped";
    let crmError: string | null = null;

    if (crmUrl) {
      const res = await fetchWithRetry(
        crmUrl,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(crmPayload),
        },
        { label: "crm-lead-sync", maxAttempts: 3 },
      );
      if (res.ok) {
        crmStatus = "synced";
      } else {
        crmStatus = "failed";
        crmError = `CRM webhook ${res.response?.status ?? "network"}`.slice(0, 300);
      }
    } else {
      crmError = "CRM_WEBHOOK_URL not configured";
    }

    // ---- 2. Instant team email with the WhatsApp deep link -----------------
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const teamEmail = Deno.env.get("ADMIN_ALERT_EMAIL") || "info@realtrust.ro";
    let emailSent = false;

    if (resendKey) {
      const rows: Array<[string, string]> = [
        ["Nume", record.name],
        ["Telefon", phoneValid ? phoneRaw : "—"],
        ["Email", record.email || "—"],
        ["Cartier", crmPayload.lead.neighbourhood || "—"],
        ["Camere", crmPayload.lead.rooms || "—"],
        ["Sursă", crmPayload.lead.source || "—"],
        ["Scor", record.lead_score != null ? `${record.lead_score} (${record.lead_grade ?? "-"})` : "—"],
        ["Campanie", utm.utm_campaign || "—"],
        ["utm_source / medium", `${utm.utm_source || "—"} / ${utm.utm_medium || "—"}`],
      ];

      const html = `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px">
          <h2 style="color:#1a365d;margin:0 0 4px">Lead nou — Nou / Necontactat</h2>
          <p style="color:#6e7480;margin:0 0 16px">Contactează-l în primele 5 minute pentru rata maximă de conversie.</p>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            ${rows.map(([k, v]) => `<tr><td style="padding:6px 0;color:#6e7480">${escapeHtml(k)}</td><td style="padding:6px 0;color:#1a365d;font-weight:600">${escapeHtml(v)}</td></tr>`).join("")}
          </table>
          ${waLink
            ? `<p style="margin:20px 0"><a href="${waLink}" style="background:#25D366;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Deschide chat WhatsApp</a></p>`
            : `<p style="margin:20px 0;color:#b45309">Lead fără telefon valid — contactează pe email.</p>`}
          <p style="color:#6e7480;font-size:12px">RealTrust Timișoara · lead ${escapeHtml(record.id)}</p>
        </div>`;

      const mail = await fetchWithRetry(
        "https://api.resend.com/emails",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "RealTrust <noreply@realtrust.ro>",
            to: [teamEmail],
            subject: `🚨 Lead nou: ${record.name} — ${crmPayload.lead.neighbourhood || crmPayload.lead.source || "website"}`,
            html,
          }),
        },
        { label: "crm-lead-sync-email", maxAttempts: 2 },
      );
      emailSent = mail.ok;
      if (!mail.ok && !crmError) crmError = "team email failed";
    }

    // ---- 3. Persist outcome (+ retry bookkeeping) ---------------------------
    // A transient failure on either channel (CRM webhook or team email) keeps the
    // row in `failed`, so the `retry-failed-crm-syncs` cron picks it up again
    // with exponential backoff (max 5 attempts).
    const transientFail = crmStatus === "failed" || (!!resendKey && !emailSent);
    const attempts = Number(payload?.is_retry ? (record as { crm_sync_attempts?: number }).crm_sync_attempts ?? 0 : 0);

    const update: Record<string, unknown> = {
      crm_sync_status: transientFail ? "failed" : crmStatus,
      crm_synced_at: transientFail ? null : new Date().toISOString(),
      crm_sync_error: crmError,
    };
    if (transientFail) {
      // Backoff handled by the SQL sweep; here we only make sure it is queued.
      update.crm_next_retry_at = new Date(Date.now() + 3 * 60_000).toISOString();
    } else {
      update.crm_next_retry_at = null;
    }
    if (!payload?.is_retry) update.crm_status = "nou_necontactat";

    await admin.from("leads").update(update).eq("id", record.id);

    return json({
      ok: true,
      crm: crmStatus,
      email_sent: emailSent,
      queued_for_retry: transientFail,
      attempts,
      whatsapp_link: waLink,
    });
  } catch (err) {
    console.error("crm-lead-sync error:", err);
    return json({ error: (err as Error)?.message ?? "unknown" }, 500);
  }
});
