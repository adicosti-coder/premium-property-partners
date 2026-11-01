// Platform E2E diagnostic (admin "Rulează Test Automat E2E").
// Non-destructive: the Calculator lead is inserted inside a rolled-back DB
// subtransaction (system_e2e_lead_probe), so no real WhatsApp/CRM message is sent.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";

type Step = { key: string; label: string; ok: boolean; detail: string; ms: number };
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function step(key: string, label: string, fn: () => Promise<{ ok: boolean; detail: string }>): Promise<Step> {
  const t = Date.now();
  try { const r = await fn(); return { key, label, ...r, ms: Date.now() - t }; }
  catch (e) { return { key, label, ok: false, detail: (e instanceof Error ? e.message : String(e)).slice(0, 300), ms: Date.now() - t }; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const gate = await requireInternalOrAdmin(req, corsHeaders);
  if (gate) return gate;
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const started = Date.now();
  let probe: any = null;

  const steps: Step[] = [];
  steps.push(await step("lead_capture", "Lead Capturing (Calculator → scor ≥60 Warm)", async () => {
    const { data, error } = await sb.rpc("system_e2e_lead_probe");
    if (error) throw new Error(error.message);
    probe = data;
    if (!data?.ok) return { ok: false, detail: data?.error || "Lead-ul de test nu a putut fi salvat" };
    const ok = Number(data.score) >= 60;
    return { ok, detail: `Scor ${data.score} (${data.grade}); test anulat automat, nimic salvat` };
  }));

  steps.push(await step("whatsapp_webhook", "WhatsApp Andrei Webhook", async () => {
    const targets: string[] = probe?.webhook_targets ?? [];
    const hasMake = !!(Deno.env.get("MAKE_WHATSAPP_WEBHOOK_URL") || "").trim();
    const triggered = targets.some((t) => /lead-score-dispatch|notify-new-lead-whatsapp/.test(t));
    const { data: last } = await sb.from("make_lead_events").select("status,created_at,error")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    const ok = hasMake && triggered;
    const parts = [
      triggered ? `Declanșat: ${targets.join(", ")}` : "Lead-ul nu a declanșat trimiterea WhatsApp",
      hasMake ? "Webhook Make configurat" : "Lipsește webhook-ul Make pentru WhatsApp",
      last ? `Ultimul eveniment Make: ${last.status} (${new Date(last.created_at).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" })})` : "",
    ];
    return { ok, detail: parts.filter(Boolean).join(" · ") };
  }));

  steps.push(await step("social_local", "Social Engine Local Data", async () => {
    const [p, a, sched] = await Promise.all([
      sb.from("properties").select("id", { count: "exact", head: true }).eq("is_active", true),
      sb.from("blog_articles").select("id", { count: "exact", head: true }).eq("is_published", true),
      sb.from("social_posts").select("id,title,caption,image_url,image_urls,video_url,media_type,property_id").eq("status", "scheduled").limit(200),
    ]);
    if (p.error || a.error || sched.error) throw new Error((p.error || a.error || sched.error)!.message);
    const bad = (sched.data ?? []).filter((x: any) => !x.caption?.trim() || !(x.image_url || x.image_urls?.length || x.video_url || x.property_id));
    const ok = (p.count ?? 0) > 0 && (a.count ?? 0) > 0 && bad.length === 0;
    return { ok, detail: `${p.count} proprietăți active, ${a.count} articole publicate (sursă locală) · ${sched.data?.length ?? 0} programate${bad.length ? `, ${bad.length} fără text/imagine: ${bad.slice(0, 3).map((b: any) => b.title).join("; ")}` : " valide"}` };
  }));

  steps.push(await step("storage_mail", "Supabase Storage & Mail Service", async () => {
    const path = `system-e2e/${crypto.randomUUID()}.txt`;
    const up = await sb.storage.from("seo-audit-reports").upload(path, new Blob(["e2e"], { type: "text/plain" }));
    if (up.error) return { ok: false, detail: `Încărcare eșuată: ${up.error.message}` };
    await sb.storage.from("seo-audit-reports").remove([path]);
    const since = new Date(Date.now() - 48 * 3600_000).toISOString();
    const [sent, failed] = await Promise.all([
      sb.from("email_send_log").select("created_at").eq("status", "sent").gte("created_at", since).order("created_at", { ascending: false }).limit(1),
      sb.from("email_send_log").select("id", { count: "exact", head: true }).in("status", ["failed", "bounced", "dlq"]).gte("created_at", since),
    ]);
    const lastSent = sent.data?.[0]?.created_at;
    const ok = !!lastSent && (failed.count ?? 0) === 0;
    return { ok, detail: `Stocare OK (fișier de test încărcat și șters) · ${lastSent ? `ultimul e-mail trimis ${new Date(lastSent).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" })}` : "niciun e-mail trimis în 48h"} · ${failed.count ?? 0} eșuate în 48h` };
  }));

  const passed = steps.every((s) => s.ok);
  const duration = Date.now() - started;
  await sb.from("e2e_test_runs").insert({
    test_type: "platform_e2e", status: passed ? "passed" : "failed", duration_ms: duration,
    details: { steps }, error_message: passed ? null : steps.filter((s) => !s.ok).map((s) => `${s.label}: ${s.detail}`).join(" | ").slice(0, 1000),
  });
  return json({ success: true, passed, duration_ms: duration, steps });
});
