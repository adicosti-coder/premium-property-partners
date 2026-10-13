// Extrage date de calificare din textul unui mesaj WhatsApp (determinist, fără AI).
// Returnează doar ce apare explicit în text — nimic inventat.
import { detectZone } from "./detectZone.ts";

export interface WaLeadDetails {
  zone: string | null;
  rooms: number | null;
  transaction: "Inchiriere" | "Cumparare" | "Vanzare" | null;
  budget: string | null;
  email: string | null;
}

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const WORD_NUM: Record<string, number> = { o: 1, un: 1, una: 1, doua: 2, doi: 2, trei: 3, patru: 4, cinci: 5 };

export function extractWaLeadDetails(raw: string | null | undefined): WaLeadDetails {
  const original = String(raw ?? "");
  const text = norm(original);
  const email = original.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase() ?? null;

  let zone = detectZone(original);
  if (!zone && /\bcomplex\b/.test(text)) zone = "Complex Studențesc";

  let rooms: number | null = null;
  if (/\b(garsonier[ae]?|studio)\b/.test(text)) rooms = 1;
  const m = text.match(/\b(\d|o|un|una|doua|doi|trei|patru|cinci)\s*(?:-\s*)?camer[ei]?\b/);
  if (m) rooms = WORD_NUM[m[1]] ?? Number(m[1]);
  if (rooms !== null && (!Number.isFinite(rooms) || rooms < 1 || rooms > 10)) rooms = null;

  let transaction: WaLeadDetails["transaction"] = null;
  if (/\b(inchiri\w*|chiri[ae]\w*|de inchiriat)\b/.test(text)) transaction = "Inchiriere";
  else if (/\b(cumpar\w*|achizit\w*|sa cumpar)\b/.test(text)) transaction = "Cumparare";
  else if (/\b(vand|vanzare|de vanzare|vindem)\b/.test(text)) transaction = "Vanzare";

  let budget: string | null = null;
  const b = text.match(/(?:buget\w*\s*(?:de|:|maxim|max)?\s*)?(\d{1,3}(?:[.\s]\d{3})+|\d+(?:[.,]\d+)?)\s*(k|mii|mie)?\s*(€|eur\w*|lei|ron)/i)
    ?? text.match(/buget\w*\s*(?:de|:|maxim|max)?\s*(\d{1,3}(?:[.\s]\d{3})+|\d+(?:[.,]\d+)?)\s*(k|mii|mie)?()/i);
  if (b) {
    let n = Number(b[1].replace(/[.\s](?=\d{3}\b)/g, "").replace(",", "."));
    if (b[2]) n *= 1000;
    const cur = /lei|ron/.test(b[3] || "") ? "lei" : "€";
    if (Number.isFinite(n) && n >= 100) budget = `${Math.round(n).toLocaleString("ro-RO")} ${cur}`;
  }
  return { zone, rooms, transaction, budget, email };
}

/** +20 dacă a dat și zona și camerele, +15 dacă a dat una dintre ele, altfel 0. */
export function waEngagementBonus(d: WaLeadDetails): number {
  if (d.zone && d.rooms) return 20;
  if (d.zone || d.rooms) return 15;
  return 0;
}

export function gradeForScore(score: number): "hot" | "warm" | "cold" {
  return score >= 80 ? "hot" : score >= 60 ? "warm" : "cold";
}

/** Câmpuri pentru `simulation_data`, citite de scoring și de e-mailul „Lead nou”. */
export function waSimulationFields(d: WaLeadDetails, lastMessage: string): Record<string, unknown> {
  return {
    ...(d.zone ? { zona: d.zone } : {}),
    ...(d.rooms ? { rooms: d.rooms } : {}),
    ...(d.transaction ? { transaction: d.transaction } : {}),
    ...(d.budget ? { budget: d.budget } : {}),
    last_wa_message: lastMessage.slice(0, 2000),
    last_wa_message_at: new Date().toISOString(),
  };
}
