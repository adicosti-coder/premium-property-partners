// Shared team-email sender with a verified-sender fallback and a DB fallback.
//
// Why: while `realtrust.ro` is not DNS-verified in Resend, sending from
// noreply@realtrust.ro returns 403. We therefore:
//   1. try RESEND_FROM (or the Resend test sender by default),
//   2. on a "domain is not verified" 403, retry once from onboarding@resend.dev,
//   3. if the send still fails, persist the notification in
//      `public.admin_email_failures` so it shows up in /admin/lead-dashboard.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fetchWithRetry } from "./fetchRetry.ts";

/** Verified Resend test sender — always allowed, delivers to the account owner. */
export const RESEND_TEST_FROM = "RealTrust <onboarding@resend.dev>";

export interface TeamEmailInput {
  to: string;
  subject: string;
  html: string;
  leadId?: string | null;
  contractId?: string | null;
  source?: string;
}

export interface TeamEmailResult {
  sent: boolean;
  from?: string;
  status?: number;
  error?: string;
  /** true when the notification was stored for the admin dashboard instead. */
  storedFallback?: boolean;
}

const isUnverifiedDomain = (status: number, body: string) =>
  status === 403 && /not verified/i.test(body || "");

export async function sendTeamEmail(
  input: TeamEmailInput,
  admin?: SupabaseClient | null,
): Promise<TeamEmailResult> {
  const key = Deno.env.get("RESEND_API_KEY");
  const primaryFrom = Deno.env.get("RESEND_FROM") || RESEND_TEST_FROM;

  const store = async (error: string, status?: number, sender?: string) => {
    if (!admin) return false;
    try {
      await admin.from("admin_email_failures").insert({
        lead_id: input.leadId ?? null,
        contract_id: input.contractId ?? null,
        recipient: input.to,
        sender: sender ?? primaryFrom,
        subject: input.subject.slice(0, 300),
        html_body: input.html.slice(0, 20000),
        error_message: error.slice(0, 500),
        http_status: status ?? null,
        source: input.source ?? "unknown",
      });
      return true;
    } catch (err) {
      console.error("admin_email_failures insert failed:", (err as Error)?.message);
      return false;
    }
  };

  if (!key) {
    const storedFallback = await store("RESEND_API_KEY not configured");
    return { sent: false, error: "RESEND_API_KEY not configured", storedFallback };
  }

  const attempt = async (from: string) =>
    await fetchWithRetry(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [input.to], subject: input.subject, html: input.html }),
      },
      { label: `team-email(${input.source ?? "generic"})`, maxAttempts: 2 },
    );

  let res = await attempt(primaryFrom);
  let usedFrom = primaryFrom;

  // Domain not verified yet → retry once from the always-verified test sender.
  if (!res.ok && isUnverifiedDomain(res.status, res.body) && primaryFrom !== RESEND_TEST_FROM) {
    console.warn(`[team-email] ${primaryFrom} rejected (unverified domain) — retrying via ${RESEND_TEST_FROM}`);
    res = await attempt(RESEND_TEST_FROM);
    usedFrom = RESEND_TEST_FROM;
  }

  if (res.ok) return { sent: true, from: usedFrom, status: res.status };

  const error = `Resend ${res.status || "network"}: ${(res.body || res.error || "").slice(0, 300)}`;
  const storedFallback = await store(error, res.status, usedFrom);
  return { sent: false, from: usedFrom, status: res.status, error, storedFallback };
}
