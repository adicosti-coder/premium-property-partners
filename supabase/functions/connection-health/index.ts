// Connection Health — live status of the database, Meta WhatsApp Cloud API and
// Make.com webhooks for the admin "Astăzi" card and status-bar pill.
// Admin/internal only. Secrets stay here: responses carry only statuses,
// codes, counts and secret NAMES (never values).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { WA_API_VERSION, WA_PHONE_NUMBER_ID, waToken } from "../_shared/waConfig.ts";
import {
  evaluateDatabase, evaluateMake, evaluateWhatsApp, overallStatus,
  type ServiceHealth, type ServiceKey,
} from "../_shared/connectionHealthRules.ts";

const PROVIDER: Record<ServiceKey, string> = { database: "conn_database", whatsapp: "conn_whatsapp", make: "conn_make" };
const CACHE_MS = 10 * 60_000;
const MAKE_SECRET_NAMES = [
  "MAKE_WEBHOOK_URL", "MAKE_WHATSAPP_WEBHOOK_URL", "MAKE_OUTREACH_WEBHOOK_URL",
  "MAKE_MONTHLY_ALERT_WEBHOOK", "MAKE_TRIAGE_WEBHOOK_URL", "MAKE_ACTIVE_WEBHOOK_URL",
];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const isoAgo = (ms: number) => new Date(Date.now() - ms).toISOString();

function bucharestHour(d = new Date()): number {
  const s = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Bucharest", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  const [h, m] = s.split(":").map(Number);
  return h + m / 60;
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let t: number | undefined;
  try {
    return await Promise.race([p, new Promise<T>((_, rej) => { t = setTimeout(() => rej(new Error("timeout")), ms); })]);
  } finally { clearTimeout(t); }
}

async function checkMetaToken() {
  const token = waToken();
  if (!token) return { tokenPresent: false, tokenCheck: { httpStatus: null } };
  try {
    const r = await withTimeout(fetch(
      `https://graph.facebook.com/${WA_API_VERSION}/${WA_PHONE_NUMBER_ID}?fields=display_phone_number,quality_rating,health_status`,
      { headers: { Authorization: `Bearer ${token}` } },
    ), 8000);
    const body = await r.json().catch(() => ({}));
    const err = body?.error;
    return {
      tokenPresent: true,
      tokenCheck: {
        httpStatus: r.status,
        errorCode: err?.code ?? null,
        errorMessage: err ? `${err.code ?? ""} ${err.message ?? ""}`.trim() : null,
        canSendMessage: body?.health_status?.can_send_message ?? null,
      },
    };
  } catch (e) {
    return { tokenPresent: true, tokenCheck: { httpStatus: null, errorMessage: e instanceof Error ? e.message : "Meta unreachable" } };
  }
}

async function runChecks(sb: ReturnType<typeof createClient>): Promise<ServiceHealth[]> {
  const checkedAt = new Date().toISOString();

  // Database: timed read, then the write is the persistence of this check.
  const t0 = performance.now();
  const read = await sb.from("external_keys_health").select("id").limit(1);
  const latencyMs = performance.now() - t0;

  const since24 = isoAgo(24 * 3600_000);
  const [meta, failures, stuck, sent, dlq, leadFails] = await Promise.all([
    checkMetaToken(),
    sb.from("wa_outbound_queue").select("last_error, updated_at").eq("status", "failed").gte("updated_at", since24).order("updated_at", { ascending: false }).limit(200),
    sb.from("wa_outbound_queue").select("id", { count: "exact", head: true }).eq("status", "pending").lt("scheduled_at", isoAgo(3600_000)),
    sb.from("wa_outbound_queue").select("id", { count: "exact", head: true }).gte("sent_at", since24),
    sb.from("make_relay_dlq").select("event, status, last_status, last_error, created_at").gte("created_at", since24).order("created_at", { ascending: false }).limit(300),
    sb.from("make_lead_events").select("id", { count: "exact", head: true }).eq("direction", "outbound").eq("status", "failed").gte("created_at", since24),
  ]);

  const hour = bucharestHour();
  const whatsapp = evaluateWhatsApp({
    ...meta,
    recentFailures: (failures.data ?? []) as { last_error: string | null; updated_at: string }[],
    stuckPending: stuck.count ?? 0,
    withinSendingHours: hour >= 10.5 && hour < 19.5,
    sent24h: sent.count ?? 0,
    checkedAt,
  });
  const make = evaluateMake({
    configured: MAKE_SECRET_NAMES.map((name) => ({ name, present: !!(Deno.env.get(name) || "").trim() })),
    deliveries: (dlq.data ?? []) as never,
    leadEventsFailed24h: leadFails.count ?? 0,
    checkedAt,
  });

  let database = evaluateDatabase({ readOk: !read.error, writeOk: true, latencyMs, error: read.error?.message, checkedAt });
  const services = () => [database, whatsapp, make];
  const rows = () => services().map((s) => ({
    provider: PROVIDER[s.key], checked_at: checkedAt, is_valid: s.status !== "red",
    status_code: s.status === "green" ? 200 : s.status === "yellow" ? 299 : 500,
    message: s.summary, details: s,
  }));
  const ins = await sb.from("external_keys_health").insert(rows());
  if (ins.error) {
    database = evaluateDatabase({ readOk: !read.error, writeOk: false, latencyMs, error: ins.error.message, checkedAt });
  }
  // Retention for this widget's rows only.
  await sb.from("external_keys_health").delete().in("provider", Object.values(PROVIDER)).lt("checked_at", isoAgo(14 * 86400_000));
  return services();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const denied = await requireInternalOrAdmin(req, corsHeaders);
  if (denied) return denied;

  let force = false;
  try { force = (await req.json())?.force === true; } catch { /* empty body */ }

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    if (!force) {
      const { data } = await sb.from("external_keys_health")
        .select("provider, details, checked_at")
        .in("provider", Object.values(PROVIDER))
        .gte("checked_at", isoAgo(CACHE_MS))
        .order("checked_at", { ascending: false })
        .limit(9);
      const latest = new Map<string, ServiceHealth>();
      for (const r of data ?? []) if (!latest.has(r.provider) && r.details) latest.set(r.provider, r.details as ServiceHealth);
      if (latest.size === 3) {
        const services = (["database", "whatsapp", "make"] as ServiceKey[]).map((k) => latest.get(PROVIDER[k])!);
        return json({ overall: overallStatus(services), services, cached: true });
      }
    }
    const services = await runChecks(sb);
    return json({ overall: overallStatus(services), services, cached: false });
  } catch (e) {
    console.error("connection-health failed:", e);
    return json({ error: "Verificarea conexiunilor a eșuat.", details: e instanceof Error ? e.message : String(e) }, 500);
  }
});
