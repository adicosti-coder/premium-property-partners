export type CalculatorEmailStatus = "pending" | "delivered" | "failed";

export type CalculatorEmailReceipt = {
  messageId: string;
  status: CalculatorEmailStatus;
  error: string | null;
};

/** Maps only provider events to delivery facts; API acceptance is not delivery. */
export function calculatorEmailReceipt(
  eventType: string,
  data: Record<string, unknown> | null | undefined,
): CalculatorEmailReceipt | null {
  const messageId = typeof data?.email_id === "string" ? data.email_id : "";
  if (!messageId) return null;

  if (eventType === "email.delivered" || eventType === "email.opened" || eventType === "email.clicked") {
    return { messageId, status: "delivered", error: null };
  }
  if (["email.bounced", "email.failed", "email.suppressed"].includes(eventType)) {
    const details = data?.bounce ?? data?.error ?? data?.reason ?? null;
    const suffix = details ? `: ${JSON.stringify(details).slice(0, 380)}` : "";
    return { messageId, status: "failed", error: `Resend ${eventType}${suffix}`.slice(0, 500) };
  }
  if (["email.sent", "email.scheduled", "email.delivery_delayed"].includes(eventType)) {
    const error = eventType === "email.delivery_delayed"
      ? "Resend: livrare întârziată temporar; furnizorul continuă încercările."
      : null;
    return { messageId, status: "pending", error };
  }
  return null;
}

const decodeBase64 = (value: string) => {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

const encodeBase64 = (bytes: ArrayBuffer) => {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary);
};

/** Verifies a Standard Webhooks/Svix signature against the raw request body. */
export async function verifyCalculatorEmailWebhook(
  payload: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  webhookSecret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature || !webhookSecret.startsWith("whsec_")) return false;
  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds) || Math.abs(nowSeconds - timestampSeconds) > 300) return false;

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      decodeBase64(webhookSecret.slice(6)),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );
    const signed = new TextEncoder().encode(`${id}.${timestamp}.${payload}`);
    const expected = encodeBase64(await crypto.subtle.sign("HMAC", key, signed));
    return signature.split(" ").some((candidate) => {
      const [version, value] = candidate.split(",");
      return version === "v1" && value === expected;
    });
  } catch {
    return false;
  }
}

export function failedNotificationChannels(
  states: { email_status: string; wa_admin_status: string; wa_client_status: string },
  channel: "email" | "whatsapp" | undefined,
) {
  return {
    email: channel !== "whatsapp" && states.email_status === "failed",
    whatsapp: channel !== "email" && (states.wa_admin_status === "failed" || states.wa_client_status === "failed"),
  };
}
