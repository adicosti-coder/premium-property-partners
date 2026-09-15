/**
 * Statusul livrării unei oferte WhatsApp, așa cum îl vede agentul în discuție:
 * livrat / în curs / eșuat.
 */
export type OfferStatusBadge = {
  label: "livrat" | "în curs" | "eșuat";
  variant: "secondary" | "outline" | "destructive";
};

export const offerStatus = (ev: {
  status?: string | null;
  error?: string | null;
}): OfferStatusBadge => {
  if (ev.error || ev.status === "failed") return { label: "eșuat", variant: "destructive" };
  if (ev.status && ["sent", "delivered", "read", "ok"].includes(ev.status))
    return { label: "livrat", variant: "secondary" };
  return { label: "în curs", variant: "outline" };
};
