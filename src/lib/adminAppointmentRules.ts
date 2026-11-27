export function bucharestToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function isUpcomingAppointment(row: { preferred_date: string | null }, now = new Date()) {
  if (!row.preferred_date) return false;
  if (row.preferred_date.length > 10) {
    const instant = Date.parse(row.preferred_date);
    return Number.isFinite(instant) && instant >= now.getTime();
  }
  return row.preferred_date >= bucharestToday(now);
}
export function appointmentTypeLabel(type: string | null) {
  if (type === "evaluation") return "Evaluare proprietate";
  if (type === "call_15min_proprietar") return "Apel proprietar · 15 min";
  if (type === "viewing") return "Vizionare";
  return type || "Programare";
}