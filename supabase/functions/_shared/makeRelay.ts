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
      return { ok: false, status: resp.status, error: body || `http_${resp.status}` };
    }
    return { ok: true, status: resp.status };
  } catch (e) {
    console.error(`[make-relay] ${event} error:`, e);
    return { ok: false, error: String(e).slice(0, 300) };
  }
}
