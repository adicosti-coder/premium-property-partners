/** Reguli pentru selecția în masă „Trimite către Andrei”. */
export interface AndreiQueueRow {
  phone_normalized: string | null;
  contact_phone: string | null;
  lifecycle_status: string | null;
  seller_type: string | null;
  andrei_queued_at: string | null;
  tags: string[] | null;
  category?: string | null;
}

export function toRoE164(p?: string | null): string {
  const d = (p ?? "").replace(/\D/g, "").replace(/^0040/, "40");
  const n = d.startsWith("40") ? d : d.startsWith("0") ? `40${d.slice(1)}` : d;
  return n ? `+${n}` : "";
}

/** Motivul pentru care rândul nu poate fi trimis, sau null dacă e eligibil. */
export function andreiIneligibleReason(r: AndreiQueueRow): string | null {
  if (r.andrei_queued_at || (r.tags ?? []).includes("apelat-andrei")) return "Trimis la Andrei";
  if (!/^\+407\d{8}$/.test(toRoE164(r.phone_normalized || r.contact_phone))) return "Telefon invalid";
  if (r.seller_type !== "privat") return "Neconfirmat";
  if (!["new", "callback"].includes(r.lifecycle_status ?? "")) return "Procesat";
  return null;
}

export function andreiScenario(category?: string | null): string {
  const c = (category ?? "").toLowerCase();
  if (c.includes("hotel")) return "Scenariu Preluare în Regim Hotelier";
  if (c.includes("rent") || c.includes("inchiri")) return "Scenariu Închiriere";
  return "Scenariu Vânzare";
}
