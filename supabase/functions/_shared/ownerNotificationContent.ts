export const OWNER_TEAM_EMAIL = "adicosti@gmail.com";
const ADMIN_URL = "https://realtrust.ro/admin";
const escape = (value: unknown) => String(value ?? "—").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));
export const conversationLink = (phone: string) => `${ADMIN_URL}/whatsapp-chat?phone=${encodeURIComponent(phone)}`;
export const approvalLink = (id: string) => `${ADMIN_URL}?inspection=${encodeURIComponent(id)}#aprobari-recente`;

type Details = Record<string, unknown>;
function html(title: string, details: Details, url: string) {
  return `<h2>${escape(title)}</h2><table>${Object.entries(details).map(([key, value]) => `<tr><th align="left">${escape(key)}</th><td>${escape(value)}</td></tr>`).join("")}</table><p><a href="${escape(url)}">Deschide în Admin</a> · <a href="${ADMIN_URL}">Admin — Astăzi</a></p>`;
}
export function bookingTeamEmail(x: { id: string; phone: string; name?: string | null; startsAt: string; time: string; listing: string; conversationId: string }) {
  const date = new Intl.DateTimeFormat("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(x.startsAt));
  const subject = `🗓️ Programare nouă Andrei: ${x.name || x.phone} – ${date} ora ${x.time}`;
  return { to: OWNER_TEAM_EMAIL, subject, source: "wa_evaluation_booked", idempotencyKey: `andrei-booking-${x.id}`, html: html(subject, { Nume: x.name || "—", Telefon: x.phone, Data: date, "Ora României": x.time, Tip: "Evaluare proprietate", Status: "În așteptarea confirmării de către Adrian", Anunț: x.listing, Conversație: x.conversationId }, conversationLink(x.phone)) };
}
export function handoffTeamEmail(x: { conversationId: string; eventId: string; phone: string; name?: string | null; reason: string; message: string }) {
  const subject = `Andrei — conversație de preluat: ${x.name || x.phone}`;
  return { to: OWNER_TEAM_EMAIL, subject, source: "wa_assistant_handoff", idempotencyKey: `andrei-handoff-${x.conversationId}-${x.eventId}`, html: html(subject, { Nume: x.name || "—", Telefon: x.phone, Motiv: x.reason, "Mesajul clientului": x.message }, conversationLink(x.phone)) };
}
export function inspectionTeamEmail(x: { event: "consent" | "inspection"; eventId: string; prospectId: string; inspectionId?: string | null; title?: string | null; zone?: string | null; price?: number | null; category?: string | null; phone: string; message?: string }) {
  const subject = `${x.event === "consent" ? "✅ Acord proprietar primit" : "🔎 Anunț nou de verificat"}: ${x.title || "Anunț"}`;
  const price = x.price ? `${x.price} €${x.category === "inchiriere" ? "/lună" : ""}` : "—";
  return { to: OWNER_TEAM_EMAIL, subject, source: `owner_${x.event}`, idempotencyKey: `owner-${x.event}-${x.eventId}`, html: html(subject, { Titlu: x.title, Preț: price, Zonă: x.zone, Telefon: x.phone, "Mesaj proprietar": x.message || "—", "ID anunț": x.prospectId }, approvalLink(x.inspectionId || x.prospectId)) };
}