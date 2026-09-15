// Mesajele automate WhatsApp (calificare + confirmare), într-un singur loc,
// ca webhook-ul Meta și puntea Make.com să trimită exact același text.

export type ProspectContext = {
  prospect_type?: string | null;
  category?: string | null;
  title?: string | null;
  zone?: string | null;
  location?: string | null;
  rooms?: number | null;
  size?: number | null;
} | null;

// `prospect_type` din scraper descrie CINE publică anunțul (proprietar/agenție),
// nu tipul de imobil — nu îl folosim niciodată ca tip de imobil în mesaj.
const PERSON_TYPES = new Set([
  "proprietar", "proprietara", "agentie", "agenție", "agent", "dezvoltator",
  "agency", "owner",
]);

const TYPE_LABELS: Record<string, string> = {
  apartament: "apartament",
  apartament_1_camera: "apartament cu 1 cameră",
  apartament_2_camere: "apartament cu 2 camere",
  apartament_3_camere: "apartament cu 3 camere",
  garsoniera: "garsonieră",
  casa: "casă",
  studio: "studio",
};

const TITLE_TYPE_PATTERNS: [RegExp, string][] = [
  [/garsonier/i, "garsonieră"],
  [/apartament/i, "apartament"],
  [/\bvil[ăa]\b/i, "vilă"],
  [/\bcas[ăa]\b/i, "casă"],
  [/\bstudio\b/i, "studio"],
  [/\bspa[țt]iu\b/i, "spațiu"],
  [/\bteren\b/i, "teren"],
];

const CATEGORY_LABELS: Record<string, string> = {
  vanzare: "de vânzare",
  inchiriere: "de închiriat",
  hotelier: "în regim hotelier",
};

/** Tipul de imobil: din tipul explicit, altfel dedus din titlul anunțului. */
function typeLabel(p: ProspectContext): string | null {
  const raw = String(p?.prospect_type ?? "").trim().toLowerCase();
  if (raw && !PERSON_TYPES.has(raw)) {
    if (TYPE_LABELS[raw]) return TYPE_LABELS[raw];
    if (/apartament|garsonier|cas[ăa]|studio|vil[ăa]/i.test(raw)) {
      return raw.replace(/_/g, " ");
    }
  }
  const title = String(p?.title ?? "");
  for (const [re, label] of TITLE_TYPE_PATTERNS) {
    if (re.test(title)) return label;
  }
  return null;
}

/** Rândul personalizat: tip de imobil, zonă, camere, suprafață (doar ce există). */
export function prospectSummary(p: ProspectContext): string | null {
  if (!p) return null;
  const parts: string[] = [];
  const t = typeLabel(p);
  if (t) parts.push(t);
  if (p.rooms && !String(t ?? "").includes("camer")) {
    parts.push(`${p.rooms} ${p.rooms === 1 ? "cameră" : "camere"}`);
  }
  if (p.size) parts.push(`${Math.round(Number(p.size))} m²`);
  const cat = CATEGORY_LABELS[String(p.category ?? "").trim().toLowerCase()];
  const where = p.zone || p.location;
  let head = parts.join(", ");
  if (head && cat) head = `${head} ${cat}`;
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
      .select("prospect_type, category, title, zone, location, rooms, size")
      .eq("phone_normalized", phone)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data ?? null) as ProspectContext;
  } catch {
    return null;
  }
}

/**
 * Răspunsurile automate pentru butoanele din primul mesaj WhatsApp
 * („Vânzare asistată”, „Administrare hotelieră”, „Nu, mulțumesc”) și pentru
 * mesajele scrise care spun același lucru. Folosit atât de webhook-ul Meta,
 * cât și de puntea Make.com, ca textul să fie identic.
 */
const stripDiacritics = (t: string) =>
  t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export function quickReplyText(raw: string): { kind: string; text: string } | null {
 kind: string; text: string } | null {
  const t = stripDiacritics(raw);
  if (/^nu[, ]|^nu$|multumesc/.test(t) && t.length <= 40) {
    return {
      kind: "quick_no",
      text:
        "Am inteles, va mulțumim pentru raspuns! Nu va mai contactam pe aceasta tema. " +
        "Daca pe viitor doriti o estimare de preț sau de venit pentru apartament, ne scrieti oricand aici.",
    };
  }
  if (/vanzare/.test(t)) {
    return {
      kind: "quick_sale",
      text:
        "Perfect, ne ocupam de vanzare asistata. Pasii sunt simpli: evaluare gratuita a apartamentului, " +
        "sedinta foto profesionala si promovare, apoi aducem doar clienti verificati la vizionari si " +
        "pregatim dosarul pana la notar.\n\nCa sa va trimit estimarea de preț, imi confirmati zona, " +
        "numarul de camere si suprafata? Va raspundem intre 09:00 si 20:00.",
    };
  }
  if (/administrare|hotel/.test(t)) {
    return {
      kind: "quick_management",
      text:
        "Excelent, administrarea in regim hotelier inseamna randament net de circa 9,4% pe an: ne ocupam " +
        "de anunturi pe Booking si Airbnb, prețuri dinamice, curatenie, check-in si raportare lunara, " +
        "iar dvs. primiti venitul net.\n\nImi spuneti zona, numarul de camere si suprafata, ca sa va " +
        "trimit estimarea de venit lunar? Va raspundem intre 09:00 si 20:00.",
    };
  }
  return null;
}
