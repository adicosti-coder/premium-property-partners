// wa-conversations-digest — backup zilnic pe e-mail al conversațiilor WhatsApp.
//
// Rulează o dată pe zi (cron) și trimite la info@realtrust.ro un rezumat +
// transcrierea completă a mesajelor din ultimele 24h, ca discuțiile să existe
// și în afara WhatsApp dacă acolo ceva eșuează.
//
// Acces: apel intern (x-cron-secret / service role) sau Admin JWT.
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { sendTeamEmail } from "../_shared/teamEmail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

const roTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" }) : "—";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const denied = await requireInternalOrAdmin(req, corsHeaders);
  if (denied) return denied;

  let body: { hours?: number; dry_run?: boolean; recipient_override?: string } = {};
  try { body = await req.json(); } catch { /* default */ }
  const hours = Math.min(168, Math.max(1, Number(body.hours ?? 24)));
  const dryRun = !!body.dry_run;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();

  const { data: messages, error: msgErr } = await supabase
    .from("wa_messages")
    .select("id, conversation_id, direction, content, template_name, error, wa_message_id, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(2000);
  if (msgErr) return json({ error: "query_failed", details: msgErr.message }, 500);

  const convIds = [...new Set((messages ?? []).map((m) => m.conversation_id))];
  const { data: convs } = convIds.length
    ? await supabase
      .from("wa_conversations")
      .select("id, phone_normalized, wa_profile_name, status, last_inbound_at, last_outbound_at")
      .in("id", convIds)
    : { data: [] as any[] };

  const convById = new Map((convs ?? []).map((c) => [c.id, c]));

  const inbound = (messages ?? []).filter((m) => m.direction === "inbound");
  const outbound = (messages ?? []).filter((m) => m.direction === "outbound");
  const failed = outbound.filter((m) => m.error);
  const delivered = outbound.length - failed.length;

  // Abandonate: clientul a scris, iar de peste 24h nu mai există activitate.
  const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count: abandoned } = await supabase
    .from("wa_conversations")
    .select("id", { count: "exact", head: true })
    .not("last_inbound_at", "is", null)
    .lt("last_inbound_at", cutoff)
    .not("status", "in", '("closed","opted_out")');

  const threads = convIds.map((cid) => {
    const c = convById.get(cid);
    const rows = (messages ?? []).filter((m) => m.conversation_id === cid);
    const items = rows.map((m) => {
      // Răspunsul exact de la Meta pentru fiecare mesaj trimis de noi.
      const metaBits: string[] = [];
      if (m.direction === "outbound") {
        if (m.error) metaBits.push(`respins: ${esc(m.error)}`);
        else if (m.wa_message_id) metaBits.push("acceptat de Meta");
        else metaBits.push("fără confirmare de la Meta");
        if (m.wa_message_id) metaBits.push(`ID ${esc(m.wa_message_id)}`);
      }
      const metaLine = metaBits.length
        ? `<div style="font-size:11px;color:${m.error ? "#b91c1c" : "#4b5563"};margin-top:2px">Meta: ${metaBits.join(" · ")}</div>`
        : "";
      return `
      <tr>
        <td style="padding:4px 8px;font-size:12px;color:#666;white-space:nowrap;vertical-align:top">${esc(roTime(m.created_at))}</td>
        <td style="padding:4px 8px;font-size:12px;font-weight:600;vertical-align:top">${m.direction === "inbound" ? "Client" : "Noi"}</td>
        <td style="padding:4px 8px;font-size:13px">${esc(m.content).slice(0, 2000)}${
        m.template_name ? ` <em style="color:#888">(șablon ${esc(m.template_name)})</em>` : ""
      }${metaLine}</td>
      </tr>`;
    }).join("");
    return `
      <div style="margin:18px 0;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
        <div style="background:#f9fafb;padding:8px 12px;font-size:13px">
          <strong>${esc(c?.wa_profile_name || c?.phone_normalized || "Conversație")}</strong>
          &nbsp;·&nbsp;${esc(c?.phone_normalized ?? "")}
          &nbsp;·&nbsp;ultim mesaj client: ${esc(roTime(c?.last_inbound_at))}
        </div>
        <table style="width:100%;border-collapse:collapse">${items}</table>
      </div>`;
  }).join("");

  const today = new Date().toLocaleDateString("ro-RO", { timeZone: "Europe/Bucharest" });
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:760px">
      <h2 style="margin:0 0 4px">Conversații WhatsApp — backup ${esc(today)}</h2>
      <p style="color:#555;font-size:13px;margin:0 0 16px">Ultimele ${hours} de ore, ApArt Hotel by RealTrust.</p>
      <table style="border-collapse:collapse;font-size:14px">
        <tr><td style="padding:4px 12px 4px 0">Conversații cu activitate</td><td><strong>${convIds.length}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0">Mesaje de la clienți</td><td><strong>${inbound.length}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0">Mesaje trimise (livrate)</td><td><strong>${delivered}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0">Mesaje eșuate</td><td><strong style="color:#b91c1c">${failed.length}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0">Conversații abandonate (&gt;24h)</td><td><strong>${abandoned ?? 0}</strong></td></tr>
      </table>
      ${threads || '<p style="color:#666">Nicio conversație în acest interval.</p>'}
    </div>`;

  const stats = {
    conversations: convIds.length,
    inbound: inbound.length,
    delivered,
    failed: failed.length,
    abandoned: abandoned ?? 0,
  };

  if (dryRun) return json({ ok: true, dry_run: true, stats });

  const recipient = body.recipient_override?.includes("@")
    ? body.recipient_override.trim()
    : "info@realtrust.ro";

  const result = await sendTeamEmail({
    to: recipient,
    subject: `WhatsApp — backup conversații ${today} (${stats.inbound} de la clienți, ${stats.failed} eșuate)`,
    html,
    source: "wa-conversations-digest",
  }, supabase);

  return json({ ok: result.sent, stats, email: result }, result.sent ? 200 : 502);
});
