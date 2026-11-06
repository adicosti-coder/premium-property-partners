import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { verifyLeadReportToken } from "../_shared/leadReportToken.ts";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { failedNotificationChannels } from "../_shared/calculatorEmailDelivery.ts";

const schema = z.object({ lead_id: z.string().uuid(), report_token: z.string().length(64).optional(), action: z.enum(["status", "retry"]).default("status"), channel: z.enum(["email", "whatsapp"]).optional() });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid request" }, 400);
  const b = parsed.data;
  const visitor = b.action === "status" && b.report_token && await verifyLeadReportToken(b.lead_id, b.report_token);
  if (!visitor) { const denied = await requireInternalOrAdmin(req, corsHeaders); if (denied) return denied; }
  const url = Deno.env.get("SUPABASE_URL"); const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return json({ error: "Unavailable" }, 503);
  const sb = createClient(url, key);
  const { data: l, error } = await sb.from("leads").select("*").eq("id", b.lead_id).like("source", "calculator_unificat%").maybeSingle();
  if (error || !l) return json({ error: "Not found" }, 404);
  if (b.action === "retry") {
    // Re-read stored data and claim only the requested, definitively failed channel.
    const sd = l.simulation_data ?? {};
    const channels = failedNotificationChannels(l, b.channel);
    if (channels.email) {
      const result = await sb.functions.invoke("crm-lead-sync", { headers: { "x-webhook-secret": key }, body: { lead_id: l.id, manual: true, retry_email: true } });
      if (result.error) return json({ error: "Email retry failed" }, 502);
    }
    if (channels.whatsapp) {
      const result = await sb.functions.invoke("handle-lead-whatsapp", {
        headers: { "x-webhook-secret": key },
        body: { nume: l.name, telefon: l.whatsapp_number, zona: sd.location ?? sd.zone ?? "Timișoara", venit_estimat_min: sd.realtrust_net_min ?? 0, venit_estimat_max: sd.realtrust_net_max ?? 0, calculator_kind: sd.calculator_kind ?? "unified", lead_id: l.id, retry: true },
      });
      if (result.error) return json({ error: "WhatsApp retry failed" }, 502);
    }
  }
  const { data: states, error: stateError } = await sb.from("leads").select("email_status,wa_admin_status,wa_client_status").eq("id", l.id).maybeSingle();
  if (stateError) return json({ error: "Status unavailable" }, 503);
  return json({ saved: true, ...states });
});