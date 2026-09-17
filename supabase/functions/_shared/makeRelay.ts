// Relay pentru automatizările Make.com (scenarii Custom webhook).
// URL-ul webhook-ului e secret: MAKE_WA_WEBHOOK_URL (fallback MAKE_WEBHOOK_URL).
// Dacă nu e configurat, relay-ul e no-op (nu blochează fluxul WhatsApp).

export type MakeRelayResult = {
  ok: boolean;
  skipped?: "not_configured";
  status?: number;
  error?: string;
};

export function makeWebhookUrl(): string {
  return (
    Deno.env.get("MAKE_WA_WEBHOOK_URL") ||
    Deno.env.get("MAKE_WEBHOOK_URL") ||
    ""
  );
}

/** Minimal shape of the service-role Supabase client we need for the DLQ. */
type DlqClient = {
  from: (table: string) => any;
};

/** Backoff in minutes per attempt count — 5m, 15m, 45m, 2h, 6h. */
const BACKOFF_MIN = [5, 15, 45, 120, 360];
const MAX_RELAY_ATTEMPTS = 6;

function nextAttemptAt(attempts: number): string {
  const min = BACKOFF_MIN[Math.min(attempts - 1, BACKOFF_MIN.length - 1)];
  return new Date(Date.now() + min * 60_000).toISOString();
}

async function pushToDlq(
  supabase: DlqClient,
  event: string,
  payload: Record<string, unknown>,
  status: number | undefined,
  error: string,
) {
  try {
    await supabase.from("make_relay_dlq").insert({
      event,
      payload,
      attempts: 1,
      last_status: status ?? null,
      last_error: error.slice(0, 500),
      next_attempt_at: nextAttemptAt(1),
    });
  } catch (e) {
    console.error("[make-relay] dlq insert failed:", e);
  }
}

export async function relayToMake(
  event: string,
  payload: Record<string, unknown>,
  /** Pass the service-role client to persist failures for automatic retry. */
  supabase?: DlqClient,
): Promise<MakeRelayResult> {
  const url = makeWebhookUrl();
  if (!url) return { ok: false, skipped: "not_configured" };

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10_000);
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        sent_at: new Date().toISOString(),
        source: "realtrust-whatsapp",
        ...payload,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) {
      const body = (await resp.text().catch(() => "")).slice(0, 300);
      console.error(`[make-relay] ${event} failed http_${resp.status}: ${body}`);
      const error = body || `http_${resp.status}`;
      if (supabase) await pushToDlq(supabase, event, payload, resp.status, error);
      return { ok: false, status: resp.status, error };
    }
    return { ok: true, status: resp.status };
  } catch (e) {
    console.error(`[make-relay] ${event} error:`, e);
    const error = String(e).slice(0, 300);
    if (supabase) await pushToDlq(supabase, event, payload, undefined, error);
    return { ok: false, error };
  }
}

/**
 * Retries relay events that Make.com rejected earlier (e.g. "Queue is full").
 * Called at the start of the WhatsApp outbound worker, so retries piggyback on
 * the existing 15-minute cron — no extra function or schedule needed.
 */
export async function drainMakeRelayDlq(
  supabase: DlqClient,
  limit = 20,
): Promise<{ retried: number; delivered: number; failed: number }> {
  const out = { retried: 0, delivered: 0, failed: 0 };
  const url = makeWebhookUrl();
  if (!url) return out;

  let rows: Array<{
    id: string;
    event: string;
    payload: Record<string, unknown>;
    attempts: number;
  }> = [];
  try {
    const { data, error } = await supabase
      .from("make_relay_dlq")
      .select("id, event, payload, attempts")
      .eq("status", "pending")
      .lte("next_attempt_at", new Date().toISOString())
      .order("next_attempt_at", { ascending: true })
      .limit(limit);
    if (error) throw error;
    rows = (data ?? []) as typeof rows;
  } catch (e) {
    console.error("[make-relay] dlq fetch failed:", e);
    return out;
  }

  for (const row of rows) {
    out.retried += 1;
    const attempts = (row.attempts ?? 1) + 1;
    let ok = false;
    let status: number | undefined;
    let error = "";
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10_000);
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: row.event,
          sent_at: new Date().toISOString(),
          source: "realtrust-whatsapp",
          retry_attempt: attempts,
          ...(row.payload ?? {}),
        }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      status = resp.status;
      ok = resp.ok;
      if (!ok) error = (await resp.text().catch(() => "")).slice(0, 300) || `http_${resp.status}`;
    } catch (e) {
      error = String(e).slice(0, 300);
    }

    const exhausted = !ok && attempts >= MAX_RELAY_ATTEMPTS;
    if (ok) out.delivered += 1;
    else if (exhausted) out.failed += 1;

    try {
      await supabase
        .from("make_relay_dlq")
        .update({
          status: ok ? "delivered" : exhausted ? "failed" : "pending",
          attempts,
          last_status: status ?? null,
          last_error: ok ? null : error,
          delivered_at: ok ? new Date().toISOString() : null,
          next_attempt_at: ok || exhausted ? new Date().toISOString() : nextAttemptAt(attempts),
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
    } catch (e) {
      console.error("[make-relay] dlq update failed:", e);
    }
  }

  if (out.retried) {
    console.log(
      `[make-relay] dlq drain: retried=${out.retried} delivered=${out.delivered} failed=${out.failed}`,
    );
  }
  return out;
}
