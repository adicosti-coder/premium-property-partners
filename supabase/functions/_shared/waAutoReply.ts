// Mesajele automate WhatsApp (calificare + confirmare), într-un singur loc,
// ca webhook-ul Meta și puntea Make.com să trimită exact același text.

export type ProspectContext = {
  prospect_type?: string | null;
  zone?: string | null;
  location?: string | null;
  rooms?: number | null;
  size?: number | null;
} | null;

const TYPE_LABELS: Record<string, string> = {
  apartament: "apartament",
  apartament_1_camera: "apartament cu 1 cameră",
  apartament_2_camere: "apartament cu 2 camere",
  apartament_3_camere: "apartament cu 3 camere",
  garsoniera: "garsonieră",
  casa: "casă",
  studio: "studio",
};

function typeLabel(raw?: string | null): string | null {
  if (!raw) return null;
  const key = String(raw).trim().toLowerCase();
  return TYPE_LABELS[key] ?? key.replace(/_/g, " ");
}

/** Rândul personalizat: tip de imobil, zonă, camere, suprafață (doar ce există). */
export function prospectSummary(p: ProspectContext): string | null {
  if (!p) return null;
  const parts: string[] = [];
  const t = typeLabel(p.prospect_type);
  if (t) parts.push(t);
  if (p.rooms && !String(t ?? "").includes("camer")) {
    parts.push(`${p.rooms} ${p.rooms === 1 ? "cameră" : "camere"}`);
  }
  if (p.size) parts.push(`${Math.round(Number(p.size))} m²`);
  const where = p.zone || p.location;
  const head = parts.join(", ");
  if (!head && !where) return null;
  if (head && where) return `Despre ${head} în ${where}:`;
  if (head) return `Despre ${head}:`;
  return `Despre proprietatea din ${where}:`;
}

/** Mesajul de calificare (prima interacțiune), personalizat când avem contextul. */
export function buildIntakeMessage(p: ProspectContext = null): string {
  const summary = prospectSummary(p);
  return [
    "Bună ziua! Ați scris pe WhatsApp-ul ApArt Hotel by RealTrust (Timișoara).",
    ...(summary ? ["", summary] : []),
    "",
    "Ca să vă putem ajuta rapid, spuneți-mi cu ce vă putem fi de folos:",
    "1️⃣ Imobiliare — vânzare, achiziție sau închiriere",
    "2️⃣ Administrare — regim hotelier sau termen mediu/lung",
    "3️⃣ Rezervare regim hotelier — https://realtrust.ro/rezervare",
    "",
    "Răspundeți cu 1, 2 sau 3 (sau descrieți în câteva cuvinte) și continuăm.",
  ].join("\n");
}

/** Confirmarea automată (mesajele următoare, când agentul nu răspunde imediat). */
export const ACK_MESSAGE = [
  "Am primit mesajul dvs., vă mulțumim!",
  "Un coleg RealTrust vă răspunde în cel mai scurt timp, în intervalul 09:00–20:00 (luni–sâmbătă).",
  "Dacă e vorba de o rezervare, puteți verifica disponibilitatea aici: https://realtrust.ro/rezervare",
].join("\n");

/** Mesajul de recontactare pentru conversații abandonate. */
export function buildReengageMessage(p: ProspectContext = null): string {
  const summary = prospectSummary(p);
  return [
    "Bună ziua! Revenim de la ApArt Hotel by RealTrust (Timișoara).",
    ...(summary ? ["", summary] : []),
    "",
    "Am rămas la mesajul dvs. și vrem să ne asigurăm că nu ați rămas fără răspuns.",
    "Dacă încă vă interesează, răspundeți cu 1 (imobiliare), 2 (administrare) sau 3 (rezervare) și continuăm.",
    "Dacă nu mai doriți mesaje, scrieți STOP.",
  ].join("\n");
}

/** Contextul prospectului legat de acest număr (best-effort). */
export async function loadProspectContext(
  supabase: { from: (t: string) => any },
  phone: string,
): Promise<ProspectContext> {
  try {
    const { data } = await supabase
      .from("prospect_listings")
      .select("prospect_type, zone, location, rooms, size")
      .eq("phone_normalized", phone)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data ?? null) as ProspectContext;
  } catch {
    return null;
  }
}
