import { describe, expect, it } from "vitest";
import {
  calculatorEmailReceipt,
  failedNotificationChannels,
  verifyCalculatorEmailWebhook,
} from "./calculatorEmailDelivery";

describe("calculator email delivery", () => {
  it("keeps provider acceptance and temporary delays pending", () => {
    expect(calculatorEmailReceipt("email.sent", { email_id: "mail-1" })?.status).toBe("pending");
    expect(calculatorEmailReceipt("email.delivery_delayed", { email_id: "mail-1" })?.status).toBe("pending");
  });

  it("marks only provider-confirmed delivery as delivered", () => {
    expect(calculatorEmailReceipt("email.delivered", { email_id: "mail-1" })).toEqual({
      messageId: "mail-1", status: "delivered", error: null,
    });
  });

  it.each(["email.bounced", "email.failed", "email.suppressed"])("records %s as a retryable failure with its reason", (event) => {
    const receipt = calculatorEmailReceipt(event, { email_id: "mail-1", reason: "invalid recipient" });
    expect(receipt?.status).toBe("failed");
    expect(receipt?.error).toContain("invalid recipient");
  });

  it("retries only the requested failed channel and never duplicates WhatsApp for email retry", () => {
    const states = { email_status: "failed", wa_admin_status: "delivered", wa_client_status: "read" };
    expect(failedNotificationChannels(states, "email")).toEqual({ email: true, whatsapp: false });
    expect(failedNotificationChannels(states, "whatsapp")).toEqual({ email: false, whatsapp: false });
  });

  it("retries failed WhatsApp without resending a delivered email", () => {
    const states = { email_status: "delivered", wa_admin_status: "failed", wa_client_status: "delivered" };
    expect(failedNotificationChannels(states, "whatsapp")).toEqual({ email: false, whatsapp: true });
  });

  it("accepts a valid raw-body signature and rejects altered payloads and old timestamps", async () => {
    const secretBytes = new TextEncoder().encode("calculator-webhook-test-secret");
    const secret = `whsec_${btoa(String.fromCharCode(...secretBytes))}`;
    const payload = JSON.stringify({ type: "email.delivered", data: { email_id: "mail-1" } });
    const timestamp = "1794000000";
    const key = await crypto.subtle.importKey("raw", secretBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signatureBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`event-1.${timestamp}.${payload}`));
    const signature = `v1,${btoa(String.fromCharCode(...new Uint8Array(signatureBytes)))}`;
    const headers = { id: "event-1", timestamp, signature };

    expect(await verifyCalculatorEmailWebhook(payload, headers, secret, Number(timestamp))).toBe(true);
    expect(await verifyCalculatorEmailWebhook(`${payload} `, headers, secret, Number(timestamp))).toBe(false);
    expect(await verifyCalculatorEmailWebhook(payload, headers, secret, Number(timestamp) + 301)).toBe(false);
  });
});
