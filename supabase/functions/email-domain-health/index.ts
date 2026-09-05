// email-domain-health
// Admin (or internal cron) endpoint that reports the DNS verification + delivery
// state for the sender subdomain (notify.realtrust.ro) and can retry pending
// notifications once DNS is healthy again.
//
// Actions:
//   status         -> run DNS-over-HTTPS checks + delivery stats (also stores a snapshot)
//   retry-pending  -> re-send every unacknowledged notification stored as fallback
//
// The cron call (x-cron-secret) uses action "status" and, when DNS is healthy,
// automatically retries pending notifications — so nothing has to be re-created
// manually after the 14-day verification window expires.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders as sdkCors } from "npm:@supabase/supabase-js@2/cors";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { isInternalCall } from "../_shared/cronAuth.ts";
import { sendTeamEmail } from "../_shared/teamEmail.ts";

const corsHeaders = {
  ...sdkCors,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-webhook-secret",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Expected setup for this project's sender subdomain. */
const SENDER_DOMAIN = "notify.realtrust.ro";
const ROOT_DOMAIN = "realtrust.ro";
const VERIFY_TXT_HOST = `_lovable-email.${ROOT_DOMAIN}`;
const VERIFY_TXT_VALUE =
  "lovable_email_verify=93b02816026ae3bae71167cef04ff097df93c40a915ffc4284a6525b968f1504";
const EXPECTED_NS = ["ns3.lovable.cloud", "ns4.lovable.cloud"];

/** Resend (actual transport used by the notification functions) SPF host. */
const RESEND_SPF_HOST = `send.${ROOT_DOMAIN}`;
const RESEND_SPF_MX = "feedback-smtp.eu-west-1.amazonses.com";
const RESEND_SPF_TXT = "v=spf1 include:amazonses.com ~all";

type Verdict = "ok" | "missing" | "drifted" | "indeterminate";

interface RecordCheck {
  type: string;
  host: string;
  expected: string;
  observed: string[];
  verdict: Verdict;
  note?: string;
}

interface DohAnswer {
  Status: number;
  Answer?: { type: number; data: string }[];
  Comment?: string;
}

async function doh(name: string, type: string): Promise<DohAnswer | null> {
  try {
    const res = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`,
      { headers: { accept: "application/dns-json" } },
    );
    if (!res.ok) return null;
    return (await res.json()) as DohAnswer;
  } catch {
    return null;
  }
}

const clean = (v: string) => v.replace(/^"|"$/g, "").replace(/\.$/, "").trim().toLowerCase();

async function runDnsChecks(): Promise<{
  records: RecordCheck[];
  delegationServing: boolean;
  senderReady: boolean;
  delegationNote: string | null;
}> {
  const [txt, ns, mx, spfMx, spfTxt] = await Promise.all([
    doh(VERIFY_TXT_HOST, "TXT"),
    doh(SENDER_DOMAIN, "NS"),
    doh(SENDER_DOMAIN, "MX"),
    doh(RESEND_SPF_HOST, "MX"),
    doh(RESEND_SPF_HOST, "TXT"),
  ]);

  const txtValues = (txt?.Answer ?? []).filter((a) => a.type === 16).map((a) => clean(a.data));
  const txtCheck: RecordCheck = {
    type: "TXT",
    host: VERIFY_TXT_HOST,
    expected: VERIFY_TXT_VALUE,
    observed: txtValues,
    verdict: txtValues.includes(VERIFY_TXT_VALUE.toLowerCase())
      ? txtValues.length > 1
        ? "drifted"
        : "ok"
      : txtValues.length
        ? "drifted"
        : "missing",
    note:
      txtValues.length > 1
        ? "Există mai multe valori pe această gazdă — păstrează doar tokenul complet."
        : undefined,
  };

  const nsValues = (ns?.Answer ?? []).filter((a) => a.type === 2).map((a) => clean(a.data));
  // SERVFAIL (Status 2) with a "lame delegation" comment means the NS records
  // exist at the registrar but the delegated zone is not being served yet.
  const lame = ns?.Status === 2 && /lame delegation/i.test(ns?.Comment ?? "");
  const nsCheck: RecordCheck = {
    type: "NS",
    host: SENDER_DOMAIN,
    expected: EXPECTED_NS.join(", "),
    observed: nsValues,
    verdict: EXPECTED_NS.every((n) => nsValues.includes(n))
      ? "ok"
      : lame
        ? "indeterminate"
        : nsValues.length
          ? "drifted"
          : "missing",
    note: lame
      ? "Delegarea NS este prezentă la registrar, dar zona delegată nu răspunde încă (lame delegation) — provizionarea trebuie reluată."
      : undefined,
  };

  const mxValues = (mx?.Answer ?? []).filter((a) => a.type === 15).map((a) => clean(a.data));
  const mxCheck: RecordCheck = {
    type: "MX",
    host: SENDER_DOMAIN,
    expected: "gestionat automat în zona delegată",
    observed: mxValues,
    verdict: mxValues.length ? "ok" : lame ? "indeterminate" : "missing",
    note: mxValues.length
      ? undefined
      : "Apare doar după ce zona delegată devine activă.",
  };

  const spfMxValues = (spfMx?.Answer ?? [])
    .filter((a) => a.type === 15)
    .map((a) => clean(a.data.replace(/^\d+\s+/, "")));
  const spfMxCheck: RecordCheck = {
    type: "MX",
    host: RESEND_SPF_HOST,
    expected: `10 ${RESEND_SPF_MX}`,
    observed: spfMxValues,
    verdict: spfMxValues.includes(RESEND_SPF_MX) ? "ok" : spfMxValues.length ? "drifted" : "missing",
    note: spfMxValues.includes(RESEND_SPF_MX)
      ? undefined
      : "Necesar pentru expedierea reală a e-mailurilor (SPF/return-path). Nu afectează MX-ul principal al domeniului.",
  };

  const spfTxtValues = (spfTxt?.Answer ?? []).filter((a) => a.type === 16).map((a) => clean(a.data));
  const spfTxtCheck: RecordCheck = {
    type: "TXT",
    host: RESEND_SPF_HOST,
    expected: RESEND_SPF_TXT,
    observed: spfTxtValues,
    verdict: spfTxtValues.includes(RESEND_SPF_TXT.toLowerCase())
      ? "ok"
      : spfTxtValues.length
        ? "drifted"
        : "missing",
    note: spfTxtValues.some((v) => v.includes("amazonses.com"))
      ? undefined
      : "SPF pentru expeditor — se adaugă pe subdomeniul send, separat de SPF-ul principal.",
  };

  const senderReady = spfMxCheck.verdict === "ok" && spfTxtCheck.verdict === "ok";

  return {
    records: [txtCheck, nsCheck, mxCheck, spfMxCheck, spfTxtCheck],
    delegationServing: mxValues.length > 0 && nsCheck.verdict === "ok",
    senderReady,
    delegationNote: lame
      ? "lame_delegation"
      : nsCheck.verdict === "missing"
        ? "ns_missing"
        : null,
  };
}

/** Ask Resend to re-verify the sending domain (no-op when the key is absent). */
async function reverifyResendDomain(): Promise<{ status: string | null; error?: string }> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return { status: null, error: "RESEND_API_KEY missing" };
  try {
    const list = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${key}` },
    });
    const body = await list.json();
    const domain = (body?.data ?? []).find((d: { name?: string }) => d.name === ROOT_DOMAIN);
    if (!domain?.id) return { status: null, error: "domain not registered at provider" };
    await fetch(`https://api.resend.com/domains/${domain.id}/verify`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
    });
    const after = await fetch(`https://api.resend.com/domains/${domain.id}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const detail = await after.json();
    return { status: (detail?.status as string) ?? null };
  } catch (e) {
    return { status: null, error: (e as Error).message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const internal = await isInternalCall(req);
  if (!internal) {
    const auth = await requireAdmin(req, corsHeaders);
    if (!auth.ok) return auth.response!;
  }

  let body: { action?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const action = String(body.action ?? "status");

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // ── retry pending notifications ────────────────────────────────────────────
  const retryPending = async () => {
    const { data: rows, error } = await admin
      .from("admin_email_failures")
      .select("id, recipient, subject, html_body, lead_id, contract_id, retry_count")
      .is("acknowledged_at", null)
      .is("resent_at", null)
      .not("html_body", "is", null)
      .order("created_at", { ascending: true })
      .limit(25);
    if (error) throw new Error(error.message);

    let sent = 0;
    let failed = 0;
    for (const row of rows ?? []) {
      const result = await sendTeamEmail(
        {
          to: row.recipient as string,
          subject: row.subject as string,
          html: row.html_body as string,
          leadId: (row.lead_id as string | null) ?? null,
          contractId: (row.contract_id as string | null) ?? null,
          source: "email-domain-health-retry",
        },
        null,
      );
      const now = new Date().toISOString();
      await admin
        .from("admin_email_failures")
        .update(
          result.sent
            ? { resent_at: now, last_retry_at: now, last_retry_error: null }
            : {
                last_retry_at: now,
                last_retry_error: (result.error ?? "unknown").slice(0, 500),
                retry_count: ((row.retry_count as number | null) ?? 0) + 1,
              },
        )
        .eq("id", row.id as string);
      result.sent ? sent++ : failed++;
    }
    return { attempted: (rows ?? []).length, sent, failed };
  };

  if (action === "retry-pending") {
    try {
      const res = await retryPending();
      return json({ ok: true, ...res });
    } catch (e) {
      return json({ error: (e as Error).message }, 500);
    }
  }

  // ── status ────────────────────────────────────────────────────────────────
  const dns = await runDnsChecks();
  const dnsHealthy = dns.records.every((r) => r.verdict === "ok");

  // The transport actually used by the notification functions is the sending
  // provider, so re-verify it whenever its SPF records are publicly visible.
  const provider = dns.senderReady
    ? await reverifyResendDomain()
    : { status: null as string | null, error: "SPF records not visible yet" };
  const sendingActive = provider.status === "verified";

  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const [pending, failed30d, resent30d] = await Promise.all([
    admin
      .from("admin_email_failures")
      .select("*", { count: "exact", head: true })
      .is("acknowledged_at", null)
      .is("resent_at", null),
    admin
      .from("admin_email_failures")
      .select("*", { count: "exact", head: true })
      .gte("created_at", since),
    admin
      .from("admin_email_failures")
      .select("*", { count: "exact", head: true })
      .gte("created_at", since)
      .not("resent_at", "is", null),
  ]);

  let autoRetry: { attempted: number; sent: number; failed: number } | null = null;
  if (sendingActive && (pending.count ?? 0) > 0) {
    try {
      autoRetry = await retryPending();
    } catch (e) {
      console.error("auto retry failed:", (e as Error).message);
    }
  }

  const snapshot = {
    domain: SENDER_DOMAIN,
    dns_healthy: dnsHealthy,
    delegation_serving: dns.delegationServing,
    delegation_note: dns.delegationNote,
    sender_dns_ready: dns.senderReady,
    provider_status: provider.status,
    provider_error: provider.error ?? null,
    sending_active: sendingActive,
    records: dns.records,
    pending_emails: pending.count ?? 0,
    failed_30d: failed30d.count ?? 0,
    resent_30d: resent30d.count ?? 0,
    auto_retry: autoRetry,
    source: internal ? "cron" : "admin",
  };


  try {
    await admin.from("email_domain_checks").insert({
      domain: SENDER_DOMAIN,
      dns_healthy: dnsHealthy,
      delegation_serving: dns.delegationServing,
      delegation_note: dns.delegationNote,
      pending_emails: snapshot.pending_emails,
      auto_retried: autoRetry?.sent ?? 0,
      details: snapshot,
      source: snapshot.source,
    });
  } catch (e) {
    console.error("snapshot insert failed:", (e as Error).message);
  }

  const { data: history } = await admin
    .from("email_domain_checks")
    .select("id, checked_at, dns_healthy, delegation_serving, delegation_note, pending_emails, auto_retried, source")
    .order("checked_at", { ascending: false })
    .limit(10);

  return json({ ok: true, ...snapshot, history: history ?? [] });
});
