import { describe, expect, it } from "vitest";
import { canRetryNotification, isConfirmedDelivery, notificationOutcome } from "../../supabase/functions/_shared/calculatorNotificationPolicy";
describe("calculator channel rules", () => {
  it("does not confirm receipt from acceptance alone", () => {
    expect(isConfirmedDelivery("accepted")).toBe(false);
    expect(isConfirmedDelivery("delivered")).toBe(true);
    expect(isConfirmedDelivery("read")).toBe(true);
  });
  it("never retries successful or uncertain channels", () => {
    expect(canRetryNotification("failed")).toBe(true);
    for (const state of ["accepted", "delivered", "read", "unknown", "sending"]) expect(canRetryNotification(state)).toBe(false);
    expect(notificationOutcome(503)).toBe("unknown");
    expect(notificationOutcome(0)).toBe("unknown");
    expect(notificationOutcome(400)).toBe("failed");
  });
});