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

/**
 * Explicația cifrelor (venit brut, Property Management, profit net) trimisă în
 * mesajele despre administrare și preț. Regulile RealTrust: ocupare medie 75%,
 * Property Management 15-20% din încasări, randament net ~9,4% pe an ca estimare
 * medie. NU se menționează „cheltuieli ≈27%” și nici comisioanele platformelor.
 */
export const FINANCE_BLOCK = [
  "Cum se calculeaza venitul dvs.:",
  "• Venituri brute: tariful pe noapte x ocupare medie de 75% pe luna.",
  "• Property Management RealTrust: 15-20% din incasari, si acopera anunturile, prețurile dinamice, comunicarea cu oaspetii, curatenia si mentenanta.",
  "• Profit net estimat: circa 9,4% pe an din valoarea apartamentului — este o estimare medie, care depinde de gradul real de ocupare si de costurile reale de administrare.",
  "Primiti si un raport lunar cu incasarile, cheltuielile si profitul net, ca sa vedeti exact cifrele.",
].join("\n");

/** Comisionul de administrare RealTrust (procent din încasări). */
export const MGMT_FEE_MIN = 0.15;
export const MGMT_FEE_MAX = 0.20;
/** Randamentul net estimat pe an, ca medie (ocupare reală + costuri reale). */
export const NET_YIELD = 0.094;

const eur = (v: number) => `${Math.round(v).toLocaleString("ro-RO")} €`;

/**
 * Cifrele pe apartamentul discutat: prețul din anunț, venitul brut estimat,
 * comisionul RealTrust de administrare și profitul net estimat. Se folosește
 * în mesajele de ofertă de pe WhatsApp și în e-mailul de ofertă.
 */
export function propertyFinanceLines(p: {
  name?: string | null;
  price?: number | null;
  rooms?: number | null;
  size?: number | null;
}): string[] {
  const price = Number(p?.price) || 0;
  if (!price) return FINANCE_BLOCK.split("\n");

  const netYear = price * NET_YIELD;
  const netMonth = netYear / 12;
  // Venitul brut din care rezultă netul, la comisioane și costuri obișnuite.
  const grossMonth = netMonth / 0.73;
  const feeMin = grossMonth * MGMT_FEE_MIN;
  const feeMax = grossMonth * MGMT_FEE_MAX;

  return [
    `Cifrele pentru ${p?.name ?? "acest apartament"}:`,
    `• Preț din anunț: ${eur(price)}.`,
    `• Venit brut estimat: circa ${eur(grossMonth)} pe luna, la o ocupare medie de 75%.`,
    `• Property Management RealTrust: 15-20% din incasari, adica ${eur(feeMin)}–${eur(feeMax)} pe luna (anunturi, prețuri dinamice, comunicare cu oaspetii, curatenie, mentenanta).`,
    `• Profit net estimat: circa ${eur(netMonth)} pe luna, adica ${eur(netYear)} pe an — un randament net de circa 9,4% pe an.`,
    "Cifrele sunt o estimare medie si depind de gradul real de ocupare si de costurile reale de administrare. Primiti lunar un raport cu incasarile, cheltuielile si profitul net.",
  ];
}

/** Același bloc, ca text pentru mesajele WhatsApp. */
export function propertyFinanceBlock(p: {
  name?: string | null;
  price?: number | null;
  rooms?: number | null;
  size?: number | null;
}): string {
  return propertyFinanceLines(p).join("\n");
}

/**
 * Acordul proprietarului pentru preluarea anunțului pe realtrust.ro și retragerea lui.
 * Se verifică ÎNAINTEA regulilor de refuz, ca „da, publicați, mulțumesc” să fie citit corect.
 */
const PUBLISH_CONSENT_RE =
  /\bda\s*public\b|\bdapublic\b|accept(?:a|ati)?\s+publicarea|sunt de acord (?:cu|sa|să)?\s*public|acord(?:ul)?\s+(?:de|pentru)\s+publicare|pute?ti\s+(?:sa\s+)?publica|publicati\s+anuntul|da,?\s*publica(?:ti|ți)?/;
const PUBLISH_REVOKE_RE =
  /\bretrag\b|nu mai public|nu mai doresc publicarea|scoateti anuntul|stergeti anuntul|scoate anuntul de pe site/;

/** Textul standard prin care cerem acordul de publicare pe realtrust.ro. */
export function publishConsentRequestText(p?: {
  title?: string | null;
  zone?: string | null;
  rooms?: number | null;
} | null): string {
  const what = p?.title
    ? `apartamentul „${p.title}”`
    : p?.zone
      ? `apartamentul din ${p.zone}`
      : "apartamentul dumneavoastra";
  return [
    `Buna ziua! Suntem RealTrust din Timisoara. Dorim sa preluam ${what} pe site-ul nostru, realtrust.ro, gratuit,`,
    "ca sa ajunga la clientii care caută direct pe site (fara costuri si fara exclusivitate).",
    "",
    "Daca sunteti de acord, raspundeti cu DA PUBLIC. Retrageti acordul oricand, scriind RETRAG.",
  ].join("\n");
}

export const PUBLISH_CONSENT_ACK =
  "Va mulțumim! Am inregistrat acordul dumneavoastra pentru publicarea anunțului pe realtrust.ro. " +
  "Anunțul apare pe site in scurt timp, fara costuri si fara exclusivitate. " +
  "Puteti retrage acordul oricand, scriind RETRAG, iar anunțul este scos imediat de pe site.";

export const PUBLISH_REVOKE_ACK =
  "Am inteles, am retras acordul: anunțul nu mai apare pe realtrust.ro. " +
  "Daca doriti sa il publicam din nou, ne scrieti aici DA PUBLIC.";

/** „consent” / „revoke” / null pentru mesajul primit de la proprietar. */
export function detectPublishIntent(raw: string): "consent" | "revoke" | null {
  const t = stripDiacritics(raw);
  if (!t) return null;
  if (PUBLISH_REVOKE_RE.test(t)) return "revoke";
  if (PUBLISH_CONSENT_RE.test(t)) return "consent";
  return null;
}

/** Refuz explicit: butonul „Nu, mulțumesc" sau un „nu" clar, fără semnale de interes. */
const EXPLICIT_NO = /^nu\s*,?\s*(mult?umesc|mersi|nu doresc)?\s*[.!]?$/;
/** Cuvinte care arată interes — anulează interpretarea de refuz. */
const INTEREST_HINT =
  /oferta|pret|estimare|astept|aștept|vreau|doresc|interes|suna|sun[ăa]|vizion|apartament|camere|zona|administrare|hotel|vanzare|rezerv/;

export function quickReplyText(raw: string): { kind: string; text: string } | null {
  const t = stripDiacritics(raw);
  const publishIntent = detectPublishIntent(raw);
  if (publishIntent === "consent") return { kind: "publish_consent", text: PUBLISH_CONSENT_ACK };
  if (publishIntent === "revoke") return { kind: "publish_revoke", text: PUBLISH_REVOKE_ACK };
  if (EXPLICIT_NO.test(t.trim()) && !INTEREST_HINT.test(t)) {
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
        "trimit estimarea de venit lunar? Va raspundem intre 09:00 si 20:00.\n\n" + FINANCE_BLOCK,
    };
  }
  return null;
}

/**
 * Răspunsul automat pentru ORICE mesaj primit de la client, ca discuțiile să nu
 * rămână neterminate nici când nu răspunde nimeni. Acoperă butoanele din primul
 * mesaj, cifrele 1/2/3, întrebările de preț, rezervările, vizionările și STOP.
 * Rulează pe server (webhook Meta), deci funcționează cu site-ul închis.
 */
export function autoReplyText(raw: string): { kind: string; text: string } | null {
  const quick = quickReplyText(raw);
  if (quick) return quick;

  const t = stripDiacritics(raw);
  if (!t) return null;

  if (/^stop\b|nu mai (vreau|doresc)|dezabon/.test(t)) {
    return {
      kind: "quick_stop",
      text:
        "Am inteles, nu va mai trimitem mesaje. Va mulțumim pentru timpul acordat! " +
        "Daca aveti nevoie de noi pe viitor, ne scrieti oricand aici.",
    };
  }

  if (/property management|ce include administrarea|ce faceti pentru|ce servicii|cu ce va ocupati|ce intra in administrare/.test(t)) {
    return {
      kind: "auto_property_management",
      text:
        "Property Management RealTrust inseamna ca ne ocupam noi de tot:\n" +
        "• Anunturi si sincronizare pe Booking, Airbnb si Expedia.\n" +
        "• Prețuri dinamice, ca apartamentul sa fie ocupat la tariful cel mai bun.\n" +
        "• Comunicare cu oaspetii, check-in automatizat si asistenta pe toata durata sederii.\n" +
        "• Curatenie profesionala, lenjerie si consumabile intre oaspeti.\n" +
        "• Mentenanta, declaratii lunare si raport financiar detaliat.\n\n" +
        "Property Management RealTrust: 15-20% din incasari, aplicat doar pe venitul realizat — daca " +
        "apartamentul nu produce, nu plătiti administrare.\n\n" +
        "Imi spuneti zona, numarul de camere si suprafata, ca sa va trimit estimarea de venit?",
    };
  }

  if (/comision|cat luati|cat retineti|ce procent|procentul|taxa voastra|cat costa administrarea/.test(t)) {
    return {
      kind: "auto_fee",
      text:
        "Property Management RealTrust: 15-20% din incasari, in functie de tipul apartamentului si de " +
        "volumul de munca. Se aplica doar pe venitul realizat, nu exista abonament fix.\n\n" +
        "In acest procent intra anunturile pe Booking si Airbnb, prețurile dinamice, comunicarea cu " +
        "oaspetii, check-in-ul, curatenia, lenjeria, mentenanta si raportul lunar.\n\n" +
        "Restul costurilor reale le discutam deschis la telefon sau la vizionare, ca sa vedeti cifrele exacte " +
        "pentru apartamentul dvs.",
    };
  }

  if (/profit|cat imi ramane|cat castig|cat scot|randament net|venit net|net pe luna/.test(t)) {
    return {
      kind: "auto_profit",
      text:
        "Profitul net estimat este de circa 9,4% pe an din valoarea apartamentului — o estimare medie, care " +
        "depinde de gradul real de ocupare si de costurile reale.\n\n" + FINANCE_BLOCK + "\n\n" +
        "Imi spuneti zona, numarul de camere si suprafata, ca sa va calculam profitul net exact pentru " +
        "apartamentul dvs.?",
    };
  }

  if (/^1\b|imobiliar|vand|cumpar|achizi|inchiri/.test(t)) {
    return {
      kind: "auto_real_estate",
      text:
        "Perfect, ne ocupam de partea imobiliara: vanzare asistata, achizitie sau inchiriere in Timisoara.\n\n" +
        "Ca sa va trimit o estimare corecta, imi spuneti zona, numarul de camere si suprafata? " +
        "Va raspundem intre 09:00 si 20:00, luni–sambata.",
    };
  }

  if (/^2\b|regim hotelier|management|randament|venit/.test(t)) {
    return {
      kind: "auto_management",
      text:
        "Excelent. In administrare regim hotelier randamentul net este de circa 9,4% pe an: anunturi pe " +
        "Booking si Airbnb, prețuri dinamice, curatenie, check-in si raportare lunara.\n\n" +
        "Imi confirmati zona, numarul de camere si suprafata, ca sa va trimit estimarea de venit lunar?\n\n" +
        FINANCE_BLOCK,
    };
  }

  if (/^3\b|rezerv|cazare|noapte|nopti|check.?in|disponibil/.test(t)) {
    return {
      kind: "auto_booking",
      text:
        "Cu placere! Pentru cazare in regim hotelier verificati disponibilitatea si prețurile aici: " +
        "https://realtrust.ro/rezervare\n\n" +
        "Daca imi spuneti perioada si numarul de persoane, va confirmam noi un apartament potrivit.",
    };
  }

  if (/dupa oferta|ce urmeaza|urmeaza dupa|pasii urmatori|ce se intampla|cum continua|dupa ce accept/.test(t)) {
    return {
      kind: "auto_after_offer",
      text:
        "Dupa ofertă pașii sunt clari:\n" +
        "1) Vizionare — direct la apartament, in intervalul 09:00–20:00, luni–sambata.\n" +
        "2) Negociere — transmitem oferta dvs. proprietarului si revenim cu decizia.\n" +
        "3) Antecontract — stabilim avansul si termenele, cu toate actele verificate.\n" +
        "4) Notar — semnare, plata finala si predarea cheilor.\n" +
        "5) Dupa achizitie, daca doriti, preluam administrarea in regim hotelier.\n\n" +
        "Nu aveti nicio obligatie pana la antecontract. Imi spuneti ziua potrivita pentru vizionare?",
    };
  }

  if (/pret|preț|cat cost|cat face|valoare|estimare|oferta/.test(t)) {
    return {
      kind: "auto_price",
      text:
        "Va trimitem imediat cifrele reale. Imi spuneti, va rog, zona, numarul de camere si suprafata " +
        "apartamentului?\n\nPrimiti estimarea de preț de vanzare si estimarea de venit in regim hotelier, " +
        "fara nicio obligatie.\n\n" + FINANCE_BLOCK,
    };
  }

  if (/vizionare|vizite|vizit[ăa]|sa vad|vedem|intalni|cand pot veni|programare|programam/.test(t)) {
    return {
      kind: "auto_meeting",
      text:
        "Sigur, organizam vizionarea direct la apartament, in intervalul 09:00–20:00, luni–sambata. " +
        "Vizita dureaza circa 30 de minute, veniti insotit de cine doriti si nu implica nicio obligatie.\n\n" +
        "Imi spuneti ziua si ora care va sunt comode? Confirmam adresa exacta si va trimitem un mesaj " +
        "cu data si ora blocate.",
    };
  }

  return null;
}
