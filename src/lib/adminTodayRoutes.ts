/**
 * Destinațiile scurtăturilor din „Astăzi” (/admin). Toate trimit direct în
 * secțiunea care rezolvă acțiunea, cu pasul/filtrul potrivit deja selectat.
 */
export const TODAY_ROUTES = {
  ownerFlow: "/admin/flux-proprietari",
  verify: "/admin/flux-proprietari?step=verify",
  contact: "/admin/flux-proprietari?step=contact",
  /** „Apeluri de făcut” din pipeline-ul unificat — include numerele fără WhatsApp. */
  noWhatsApp: "/admin/unified-pipeline?section=prospects&subtab=calls",
  whatsappQueue: "/admin/whatsapp-queue",
  callLog: "/admin/call-dashboard",
  socialEngine: "/admin/social-engine",
} as const;

/** Chatul WhatsApp deschis direct pe conversația cu numărul dat. */
export function whatsappChatRoute(phone?: string | null): string {
  const p = String(phone ?? "").trim();
  return p ? `/admin/whatsapp-chat?phone=${encodeURIComponent(p)}` : "/admin/whatsapp-chat";
}

/** Fișa anunțului de proprietar (detalii + mesaj de contact). */
export function prospectDetailRoute(id: string): string {
  return `/admin/anunt-proprietar/${encodeURIComponent(id)}`;
}

/** Cifrele naționale ale unui număr românesc, indiferent de prefix (+40, 0040, 40, 0). */
export function phoneCore(phone?: string | null): string {
  let d = String(phone ?? "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("40") && d.length > 9) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  return d;
}

export function samePhone(a?: string | null, b?: string | null): boolean {
  const x = phoneCore(a);
  return x.length >= 6 && x === phoneCore(b);
}
