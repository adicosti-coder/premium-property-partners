export function inspectionReviewPolicy(status: string, action: "approve" | "reject", consent: { status: string; revoked_at?: string | null } | null) {
  if (!["pending", "approved_waiting_consent", "approved"].includes(status)) return { allowed: false, publish: false, nextStatus: status };
  const hasConsent = !!consent && !consent.revoked_at && ["pending_approval", "granted", "published"].includes(consent.status);
  return { allowed: true, publish: action === "approve" && hasConsent, nextStatus: action === "reject" ? "rejected" : hasConsent ? "approved" : "approved_waiting_consent" };
}