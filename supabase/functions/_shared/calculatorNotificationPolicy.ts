export type NotificationStatus = "pending" | "sending" | "accepted" | "delivered" | "read" | "failed" | "unknown";

export const isConfirmedDelivery = (status?: string | null) => status === "delivered" || status === "read";
export const canRetryNotification = (status?: string | null) => status === "failed";

/** A timeout or upstream 5xx can happen after acceptance; never blindly resend it. */
export function notificationOutcome(httpStatus: number, messageId?: string | null): NotificationStatus {
  if (httpStatus >= 200 && httpStatus < 300 && messageId) return "accepted";
  if (httpStatus >= 400 && httpStatus < 500 && httpStatus !== 408) return "failed";
  return "unknown";
}