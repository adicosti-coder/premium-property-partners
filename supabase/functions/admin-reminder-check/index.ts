// Admin Reminder Check
// Trimite mementourile ajunse la timp din `public.admin_reminders` (email către
// admin, prin `_shared/teamEmail.ts`) și le marchează ca trimise.
// Rulează din pg_cron (o dată pe oră); acceptă doar apeluri interne.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { isInternalCall } from "../_shared/cronAuth.ts";
import { sendTeamEmail } from "../_shared/teamEmail.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!(await isInternalCall(req))) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const dryRun = req.method === "POST"
    ? (await req.json().catch(() => ({})))?.dry_run === true
    : false;

  const { data: due, error: listError } = await supabase
    .from("admin_reminders")
    .select("id, title, body, recipient, source")
    .eq("status", "pending")
    .lte("due_at", new Date().toISOString())
    .order("due_at", { ascending: true })
    .limit(5);

  if (listError) {
    return new Response(JSON.stringify({ error: listError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: Array<{ id: string; title: string; sent: boolean; error?: string }> = [];

  for (const row of due ?? []) {
    if (dryRun) {
      results.push({ id: row.id, title: row.title, sent: false, error: "dry_run" });
      continue;
    }

    const when = new Intl.DateTimeFormat("ro-RO", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Europe/Bucharest",
    }).format(new Date());

    const res = await sendTeamEmail(
      {
        to: row.recipient,
        subject: `Memento: ${row.title}`,
        source: row.source ?? "admin_reminders",
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#111">
            <h2 style="margin:0 0 8px;color:#0B3B6B">Memento programat</h2>
            <p style="margin:0 0 12px;color:#555">Trimis la ${escapeHtml(when)} (ora României).</p>
            <div style="background:#F5F7FA;border-left:4px solid #D4AF37;padding:14px 16px;border-radius:6px">
              <strong style="display:block;margin-bottom:6px">${escapeHtml(row.title)}</strong>
              <div style="white-space:pre-wrap">${escapeHtml(row.body || "")}</div>
            </div>
            <p style="margin:16px 0 0;color:#555">
              Răspundeți la acest email sau scrieți în aplicație ca să continuăm.
            </p>
          </div>`,
      },
      supabase,
    );

    if (res.sent) {
      await supabase
        .from("admin_reminders")
        .update({ status: "sent", sent_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() })
        .eq("id", row.id);
    } else {
      await supabase
        .from("admin_reminders")
        .update({ status: "failed", last_error: (res.error ?? "trimitere eșuată").slice(0, 500), updated_at: new Date().toISOString() })
        .eq("id", row.id);
    }

    results.push({ id: row.id, title: row.title, sent: res.sent, error: res.error });
  }

  return new Response(
    JSON.stringify({ checked: (due ?? []).length, results, dry_run: dryRun }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
