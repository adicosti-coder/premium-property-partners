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

export async function relayToMake(
  event: string,
  payload: Record<string, unknown>,
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
