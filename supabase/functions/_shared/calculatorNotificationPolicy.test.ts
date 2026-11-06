import { describe, expect, it } from "vitest";
import { canRetryNotification, isConfirmedDelivery, notificationOutcome } from "./calculatorNotificationPolicy";

describe("calculator notification reliability", () => {
  it("only delivery or read confirms Andrei received the request", () => {
    expect(isConfirmedDelivery("accepted")).toBe(false);
    expect(isConfirmedDelivery("delivered")).toBe(true);
    expect(isConfirmedDelivery("read")).toBe(true);
  });
  it("allows retry only for a definitive failure, never a timeout or successful send", () => {
    expect(canRetryNotification("failed")).toBe(true);
    for (const state of ["sending", "unknown", "accepted", "delivered", "read", "pending"]) expect(canRetryNotification(state)).toBe(false);
  });
  it("treats transport and upstream uncertainty as non-retryable", () => {
    expect(notificationOutcome(0)).toBe("unknown");
    expect(notificationOutcome(503)).toBe("unknown");
    expect(notificationOutcome(408)).toBe("unknown");
    expect(notificationOutcome(200)).toBe("unknown");
    expect(notificationOutcome(200, "wamid.test")).toBe("accepted");
    expect(notificationOutcome(400)).toBe("failed");
  });
});