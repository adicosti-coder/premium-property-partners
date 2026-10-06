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
  price?: number | null;
  currency?: string | null;
  contact_name?: string | null;
} | null;

export type ConversationMessage = {
  direction: "inbound" | "outbound";
  content?: string | null;
  tool_call?: { auto_reply?: string } | null;
};

type ClientReply = { kind: string; text: string };

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

/** Textul EXACT al primului mesaj de calificare (text aprobat de utilizator). */
export const INTAKE_MESSAGE = `Salut! Sunt Andrei de la RealTrust. 🏢

Pentru a vă conecta direct cu colegul potrivit, spuneți-ne pe scurt:

PROPRIETAR

1️⃣ Regim Hotelier (Venit maxim, administrare 100% inclusă)

2️⃣ Închiriere Termen Lung sau Vânzare (Chiriași verificați / Cumpărători serioși)

CLIENT / OASPETE

3️⃣ Doresc să Închiriez sau să Cumpăr o proprietate

👉 Trimiteți doar cifra (1, 2 sau 3) și revenim în max. 5 minute!`;

/** Mesajul de calificare (prima interacțiune) — text fix, identic pentru toți. */
export function buildIntakeMessage(_p: ProspectContext = null): string {
  return INTAKE_MESSAGE;
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
    "Dacă încă vă interesează, răspundeți cu 1 (administrare regim hotelier), 2 (vânzare sau închiriere) sau 3 (cautați o locuință) și continuăm.",
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
      .select("prospect_type, category, title, zone, location, rooms, size, price, currency, contact_name")
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
 * („Colaborare vânzare”, „Închiriere clasică”, „Regim hotelier”) și pentru
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
      text: "Am înțeles. Nu vă mai deranjăm. Dacă vă pot ajuta altădată, îmi scrieți aici. O zi frumoasă!",
    };
  }

  if (/vanzare/.test(t)) {
    return {
      kind: "quick_sale",
      text: "Perfect. Vă ajutăm să vindeți cu mai puține drumuri și doar cumpărători potriviți. În ce zonă este apartamentul?",
    };
  }
  if (/inchiriere clasica/.test(t)) {
    return {
      kind: "quick_classic_rent",
      text: "Perfect. Selectăm chiriașii și protejăm încasarea, ca dumneavoastră să aveți liniște. În ce zonă este apartamentul?",
    };
  }
  if (/administrare|hotel/.test(t)) {
    return {
      kind: "quick_management",
      text: "Excelent. Noi preluăm administrarea, iar dumneavoastră păstrați controlul și vedeți clar încasările. În ce zonă este apartamentul?",
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
export function autoReplyText(
  raw: string,
  ctx: ProspectContext = null,
): { kind: string; text: string } | null {
  const quick = quickReplyText(raw);
  if (quick && /^(publish_|quick_no)/.test(quick.kind)) return quick;
  // Răspunsurile de proprietar (vizionare la apartamentul lui, obiecții de
  // comision/preț) se aplică DOAR când expeditorul e legat de un anunț din
  // prospect_listings (ctx !== null). Altfel un cumpărător/chiriaș care zice
  // „vizionare” sau „prea scump” ar primi răspunsul de proprietar.
  if (ctx) {
    const owner = ownerReplyText(raw, ctx);
    if (owner) return owner;
  }
  if (quick) return quick;

  const t = stripDiacritics(raw);
  if (!t) return null;

  if (/^stop\b|nu mai (vreau|doresc)|dezabon/.test(t)) {
    return {
      kind: "quick_stop",
      text: "Am înțeles. Nu vă mai trimitem mesaje. Dacă aveți nevoie de noi, ne puteți scrie oricând aici.",
    };
  }

  if (/property management|ce include administrarea|ce faceti pentru|ce servicii|cu ce va ocupati|ce intra in administrare/.test(t)) {
    return {
      kind: "auto_property_management",
      text: "Pe scurt: dumneavoastră încasați, noi gestionăm prețurile, oaspeții și apartamentul. Vreți să vedeți cât v-ar putea rămâne net?",
    };
  }

  if (/comision|cat luati|cat retineti|ce procent|procentul|taxa voastra|cat costa administrarea/.test(t)) {
    return {
      kind: "auto_fee",
      text: "E firesc să vă uitați la cost. Administrarea este 15–20% doar din încasări, fără abonament; important este cât vă rămâne net. Vreți o simulare?",
    };
  }

  if (/profit|cat imi ramane|cat castig|cat scot|randament net|venit net|net pe luna/.test(t)) {
    return {
      kind: "client_hotel_income_ask_zone",
      text: "Sigur — calculăm realist, nu din promisiuni. În ce zonă este apartamentul?",
    };
  }

  if (/^2\b|^3\b|imobiliar|vand|cumpar|achizi|inchiri/.test(t)) {
    return {
      kind: "auto_real_estate",
      text: "Cu drag. Ca să vă îndrum corect, doriți să vindeți sau să închiriați?",
    };
  }

  if (/^1\b|regim hotelier|management|randament|venit/.test(t)) {
    return {
      kind: "auto_management",
      text: "Excelent. Noi preluăm operarea, iar dumneavoastră vedeți lunar exact ce produce apartamentul. În ce zonă este?",
    };
  }

  if (/rezerv|cazare|noapte|nopti|check.?in|disponibil/.test(t)) {
    return {
      kind: "auto_booking",
      text: "Cu drag. Îmi spuneți perioada dorită, iar eu vă ajut cu opțiunea potrivită; disponibilitatea este și aici: https://realtrust.ro/rezervare",
    };
  }

  if (/dupa oferta|ce urmeaza|urmeaza dupa|pasii urmatori|ce se intampla|cum continua|dupa ce accept/.test(t)) {
    return {
      kind: "auto_after_offer",
      text: "După vizionare, vă însoțim simplu prin ofertă, verificarea actelor și semnare, fără presiune. Vă este mai comod în timpul săptămânii sau sâmbătă?",
    };
  }

  if (/pret|preț|cat cost|cat face|valoare|estimare|oferta/.test(t)) {
    return {
      kind: "client_price_ask_zone",
      text: "Sigur — vă ajut să găsiți un preț potrivit. În ce zonă căutați?",
    };
  }

  if (/vizionare|vizite|vizit[ăa]|sa vad|vedem|intalni|cand pot veni|programare|programam/.test(t)) {
    return {
      kind: "client_viewing_ask_zone",
      text: "Sigur, vă ajut cu vizionarea. În ce zonă căutați?",
    };
  }

  return null;
}

const CLIENT_VIEWING_STEPS = new Set([
  "client_viewing_ask_zone",
  "client_viewing_ask_rooms",
  "client_viewing_ask_day",
  "client_viewing_ask_time",
]);

const CLIENT_ZONE_STEPS = new Set([
  "client_viewing_ask_zone",
  "client_price_ask_zone",
  "client_rent_ask_zone",
  "client_hotel_income_ask_zone",
]);

function answerAfter(messages: ConversationMessage[], autoKind: string): string | null {
  const promptIndex = messages.findLastIndex(
    (message) => message.direction === "outbound" && message.tool_call?.auto_reply === autoKind,
  );
  if (promptIndex < 0) return null;
  const answer = messages.slice(promptIndex + 1).find((message) => message.direction === "inbound");
  return String(answer?.content ?? "").trim() || null;
}

/** Zona oferită de client este păstrată din ultimul răspuns la o întrebare de zonă. */
export function rememberedClientZone(messages: ConversationMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    const kind = message.direction === "outbound" ? message.tool_call?.auto_reply ?? "" : "";
    if (!CLIENT_ZONE_STEPS.has(kind)) continue;
    const answer = messages.slice(i + 1).find((item) => item.direction === "inbound");
    const zone = String(answer?.content ?? "").trim();
    if (zone && zone.length <= 80) return zone;
  }
  return null;
}

function clientIntent(raw: string): "viewing" | "rent" | "hotel_income" | "price" | null {
  const t = stripDiacritics(raw);
  if (/vizionare|vizite|vizit[ăa]|sa vad|vedem|intalni|cand pot veni|programare|programam/.test(t)) return "viewing";
  if (/venit hotelier|regim hotelier|randament|cat produce|cat as castiga|cat castig/.test(t)) return "hotel_income";
  if (/chirie|chiria|de inchiriat|inchiriere|cat e chiria|cat costa chiria/.test(t)) return "rent";
  if (/pret|preț|cat cost|cat face|valoare|estimare|oferta/.test(t)) return "price";
  return null;
}

function replyForKnownZone(intent: NonNullable<ReturnType<typeof clientIntent>>, zone: string): ClientReply {
  if (intent === "viewing") {
    return { kind: "client_viewing_ask_rooms", text: `Cu drag. Am păstrat zona ${zone}. Câte camere doriți?` };
  }
  if (intent === "rent") {
    return { kind: "client_rent_ask_rooms", text: `Perfect, am păstrat zona ${zone}. Câte camere vi s-ar potrivi?` };
  }
  if (intent === "hotel_income") {
    return { kind: "client_hotel_income_ask_rooms", text: `Sigur. Pentru ${zone}, câte camere are apartamentul?` };
  }
  return { kind: "client_price_ask_goal", text: `Sigur. Pentru ${zone}, vă interesează cumpărarea sau închirierea?` };
}

/** Răspunsuri scurte pentru clienți, reutilizând zona deja spusă în conversație. */
/** Răspunsul arată ca un interval de apel (zi/oră/moment al zilei), nu ca o întrebare. */
export function looksLikeCallInterval(raw: string): boolean {
  if (/\?/.test(raw)) return false;
  const t = stripDiacritics(raw).toLowerCase();
  return /\b(pranz|dimineata|dimineat\w*|seara|searа|dupa[- ]?amiaza|dupa|inainte|ora|orele|azi|astazi|maine|poimaine|oricand|acum|luni|marti|miercuri|joi|vineri|sambata|duminica|weekend)\b/.test(t) ||
    /\b([01]?\d|2[0-3])([:.][0-5]\d|\s?(h|am|pm))?\b/.test(t) && /\b([01]?\d|2[0-3])([:.][0-5]\d|\s?h)\b|\b(la|dupa|inainte de|intre)\s+([01]?\d|2[0-3])\b/.test(t);
}

export function clientPreparedReply(raw: string, messages: ConversationMessage[]): ClientReply | null {
  const lastOutbound = [...messages].reverse().find((message) => message.direction === "outbound");
  const lastKind = lastOutbound?.tool_call?.auto_reply ?? "";
  const zone = rememberedClientZone(messages);

  if (CLIENT_ZONE_STEPS.has(lastKind) && zone) {
    if (lastKind === "client_viewing_ask_zone") return replyForKnownZone("viewing", zone);
    if (lastKind === "client_rent_ask_zone") return replyForKnownZone("rent", zone);
    if (lastKind === "client_hotel_income_ask_zone") return replyForKnownZone("hotel_income", zone);
    return replyForKnownZone("price", zone);
  }

  const viewingStep = clientViewingStepReply(messages);
  if (viewingStep) return viewingStep;

  const t = stripDiacritics(raw);

  // Cerere de apel de la client: confirmăm, apoi un singur subiect.
  if (/sunati|suna-ma|sunati-ma|ma puteti suna|un telefon|apelati|vorbim la telefon|prefer telefon|ma sunati/.test(t)) {
    return { kind: "client_call_ask_topic", text: "Sigur, vă sună un coleg RealTrust. Ca să fie pregătit: vorbim despre vizionare, preț sau comision?" };
  }
  if (lastKind === "client_call_ask_topic") {
    if (/vizion|vad|programa/.test(t)) return { kind: "client_call_viewing", text: "Perfect. Colegul vă sună cu variantele de vizionare. Vă este mai comod înainte de prânz sau după?" };
    if (/pret|cost|buget|chiri/.test(t)) return { kind: "client_call_price", text: "Perfect. Colegul vă sună cu prețuri reale din zonă. Ce buget aproximativ aveți în minte?" };
    if (/comision/.test(t)) return { kind: "client_call_fee", text: "Perfect. Colegul vă explică la telefon comisionul, transparent, înainte de orice pas. Înainte de prânz sau după?" };
    return { kind: "client_call_time", text: "Am notat. Vă este mai comod înainte de prânz sau după?" };
  }
  // Notăm intervalul doar dacă răspunsul chiar arată ca un interval (nu o întrebare oarecare).
  if (
    ["client_call_viewing", "client_call_price", "client_call_fee", "client_call_time"].includes(lastKind) &&
    looksLikeCallInterval(raw)
  ) {
    return { kind: "client_call_noted", text: "Mulțumesc, am notat. Colegul vă sună în intervalul ales." };
  }

  // Obiecții clienți: validare scurtă + o singură întrebare.
  if (/prea scump|e scump|cam scump|prea mult|prea mare pretul|pret mare|nu-mi permit|buget mic|mai ieftin/.test(t)) {
    return { kind: "client_obj_price", text: zone
      ? `Vă înțeleg, bugetul contează. Pentru ${zone}, ce sumă v-ar fi confortabilă?`
      : "Vă înțeleg, bugetul contează. Ce sumă v-ar fi confortabilă?" };
  }
  if (/comision/.test(t)) {
    return { kind: "client_obj_fee", text: "Întrebare corectă. Comisionul îl discutăm transparent înainte de orice pas. Căutați să cumpărați sau să închiriați?" };
  }
  if (/durat|perioad|minim|cat timp|termen|contract|luni minim|pe termen/.test(t) && !/vizion/.test(t)) {
    return { kind: "client_obj_duration", text: "Sigur, găsim o durată potrivită pentru dumneavoastră. Pe câte luni v-ați gândi?" };
  }

  // Răspuns la pasul de obiectivul clientului.
  if (lastKind === "client_goal_ask" || lastKind === "client_obj_fee") {
    if (/cumpar|achizit|vanzare/.test(t)) return zone ? replyForKnownZone("price", zone) : { kind: "client_price_ask_zone", text: "Perfect. În ce zonă căutați?" };
    if (/inchir|chiri/.test(t)) return zone ? replyForKnownZone("rent", zone) : { kind: "client_rent_ask_zone", text: "Perfect. În ce zonă căutați?" };
    if (/cazare|noapte|sejur/.test(t)) return { kind: "client_stay_ask_dates", text: "Cu drag. Pentru ce perioadă căutați cazare?" };
  }
  if (lastKind === "client_obj_price" || lastKind === "client_obj_duration") {
    return { kind: "client_obj_followup_rooms", text: "Perfect, am notat. Câte camere vă trebuie?" };
  }
  if (lastKind === "client_obj_followup_rooms") {
    return { kind: "client_viewing_ask_day", text: "Super. Vreți să vedeți o variantă potrivită? Ce zi v-ar fi comodă?" };
  }

  const intent = clientIntent(raw);
  if (!intent) {
    // Mesaj liber: un singur pas simplu, fără să repetăm întrebarea.
    if (lastKind === "client_goal_ask" || raw.trim().length < 2) return null;
    return { kind: "client_goal_ask", text: "Vă ajut cu drag. Căutați să cumpărați, să închiriați sau cazare?" };
  }
  if (zone) return replyForKnownZone(intent, zone);
  if (intent === "viewing") {
    return { kind: "client_viewing_ask_zone", text: "Cu drag. În ce zonă doriți vizionarea?" };
  }
  if (intent === "rent") {
    return { kind: "client_rent_ask_zone", text: "Sigur, găsim ceva potrivit. În ce zonă căutați?" };
  }
  if (intent === "hotel_income") {
    return { kind: "client_hotel_income_ask_zone", text: "Sigur — calculăm realist, nu din promisiuni. În ce zonă este apartamentul?" };
  }
  return { kind: "client_price_ask_zone", text: "Sigur — vă ajut să găsiți un preț potrivit. În ce zonă căutați?" };
}

/** Continuă vizionarea unui client cu exact o întrebare per mesaj. */
export function clientViewingStepReply(
  messages: ConversationMessage[],
): { kind: string; text: string } | null {
  const lastOutbound = [...messages].reverse().find((message) => message.direction === "outbound");
  const lastKind = lastOutbound?.tool_call?.auto_reply ?? "";
  if (!CLIENT_VIEWING_STEPS.has(lastKind)) return null;

  if (lastKind === "client_viewing_ask_zone") {
    return { kind: "client_viewing_ask_rooms", text: "Perfect. Câte camere doriți?" };
  }
  if (lastKind === "client_viewing_ask_rooms") {
    return { kind: "client_viewing_ask_day", text: "Am înțeles. În ce zi v-ar fi comodă vizionarea?" };
  }
  if (lastKind === "client_viewing_ask_day") {
    return { kind: "client_viewing_ask_time", text: "Sigur. La ce oră vă este comod?" };
  }

  const zone = answerAfter(messages, "client_viewing_ask_zone");
  const rooms = answerAfter(messages, "client_viewing_ask_rooms");
  const day = answerAfter(messages, "client_viewing_ask_day");
  const time = answerAfter(messages, "client_viewing_ask_time");
  const details = [zone, rooms, day, time].filter(Boolean).join(" · ");
  return {
    kind: "client_viewing_confirmed",
    text: details
      ? `Perfect, am notat vizionarea: ${details}. Un coleg RealTrust vă trimite aici adresa exactă cu o zi înainte.`
      : "Perfect, am notat vizionarea. Un coleg RealTrust vă trimite aici adresa exactă cu o zi înainte.",
  };
}


// ─────────────────────────────────────────────────────────────────────────────
// Răspunsuri pentru proprietari: obiecții (comision, preț, „fără agenții”) și
// interes de vizionare/colaborare. Personalizate cu zona, camerele și prețul
// din anunț. Reguli: doar Property Management 15–20%, vizionarea se face la
// apartament (nu avem birou), orașul este Timișoara.
// ─────────────────────────────────────────────────────────────────────────────

/** Tipurile de răspuns care înseamnă „proprietarul vrea să continue” → predare către om. */
export const OWNER_HANDOVER_KINDS = new Set(["owner_viewing", "owner_collab_yes", "owner_call_request"]);

function ownerRef(ctx: ProspectContext): string {
  const parts: string[] = [];
  if (ctx?.rooms) parts.push(`${ctx.rooms} ${ctx.rooms === 1 ? "cameră" : "camere"}`);
  const where = ctx?.zone || ctx?.location;
  const base = parts.length ? `apartamentul de ${parts.join(", ")}` : "apartamentul dumneavoastră";
  return where ? `${base} din ${where}` : base;
}

function ownerPrice(ctx: ProspectContext): string | null {
  const v = Number(ctx?.price);
  if (!v || !Number.isFinite(v)) return null;
  const sym = String(ctx?.currency || "EUR").toUpperCase() === "RON" ? "lei" : "€";
  return `${Math.round(v).toLocaleString("ro-RO")} ${sym}`;
}

function ownerHello(ctx: ProspectContext): string {
  const n = String(ctx?.contact_name ?? "").trim().split(/\s+/)[0];
  return n && n.length > 1 && !/proprietar|privat|persoan/i.test(n) ? `${n}, ` : "";
}

// Închidere cu alegere între două variante ușoare (pas mic, fără obligație).
const VIEWING_CLOSE =
  "Dacă simțiți că merită, stabilim o vizionare fără obligații. Vă este mai comod dimineața sau după-amiaza?";

/** Tipul anunțului proprietarului: vânzare / închiriere termen lung / regim hotelier. */
type ListingMode = "vanzare" | "inchiriere" | "hotelier" | null;

function listingMode(ctx: ProspectContext): ListingMode {
  const cat = stripDiacritics(String(ctx?.category ?? ""));
  if (/vanzare|sale/.test(cat)) return "vanzare";
  if (/hotelier|hotel/.test(cat)) return "hotelier";
  if (/inchiri|rent/.test(cat)) return "inchiriere";
  const title = stripDiacritics(String(ctx?.title ?? ""));
  if (/de vanzare|vand|vânzare/.test(title)) return "vanzare";
  if (/regim hotelier/.test(title)) return "hotelier";
  if (/de inchiriat|inchiriez|chirie/.test(title)) return "inchiriere";
  return null;
}

/** Fraza de valoare potrivită tipului de anunț, folosită în răspunsurile la obiecții. */
function modeValueLine(mode: ListingMode, ref: string): string {
  switch (mode) {
    case "vanzare":
      return `Pentru ${ref} vă trimit gratuit o estimare bazată pe vânzări recente din zonă.`;
    case "inchiriere":
      return `Pentru ${ref} vă trimit gratuit o estimare realistă de chirie.`;
    case "hotelier":
      return `Pentru ${ref} vă trimit gratuit o estimare de venit hotelier, ca să comparați opțiunile.`;
    default:
      return `Pentru ${ref} vă trimit gratuit o estimare realistă.`;
  }
}

export function ownerReplyText(raw: string, ctx: ProspectContext = null): { kind: string; text: string } | null {
  const t = stripDiacritics(raw);
  if (!t) return null;
  const ref = ownerRef(ctx);
  const hi = ownerHello(ctx);
  const price = ownerPrice(ctx);
  const mode = listingMode(ctx);

  // 1) Interes de vizionare — confirmare caldă + alegere simplă (zi), fără efort.
  if (/vizion|sa veniti|puteti veni|veniti sa|sa vedeti apartament|cand puteti|cand veniti|ne vedem|programare|programam/.test(t)) {
    return {
      kind: "owner_viewing",
      text: `Mă bucur, ${hi}mulțumesc! Vedem ${ref} fără grabă și fără obligații. Vă este mai comod dimineața sau după-amiaza?`,
    };
  }

  // 2) Cerere de apel — confirmăm și cerem doar intervalul preferat.
  if (/sunati|suna-ma|sunati-ma|ma puteti suna|un telefon|apelati|vorbim la telefon|prefer telefon/.test(t)) {
    return {
      kind: "owner_call_request",
      text: `Sigur, ${hi}vă sună un coleg RealTrust. Vă este mai comod înainte de prânz sau după?`,
    };
  }

  // 3) „Nu lucrez cu agenții” — validare, reducerea riscului, pas mic.
  if (/nu (colaborez|lucrez|vreau|doresc)\s+(cu\s+)?(agenti|agentii|agentie|intermediar)|fara agent|fara intermediar|nu vreau agentie/.test(t)) {
    return {
      kind: "owner_obj_agency",
      text: `Vă înțeleg, ${hi}e important să păstrați controlul. La noi nu există exclusivitate; ${modeValueLine(mode, ref).toLowerCase()} V-o trimit aici?`,
    };
  }

  // 4) Comision — validare, risc zero, valoare concretă, apoi pas mic.
  if (/comision.*(mare|mult|scump)|(mare|mult|scump).*comision|nu (platesc|dau|vreau) comision|fara comision|prea scump|prea mult/.test(t)) {
    return {
      kind: "owner_obj_fee",
      text:
        `Aveți dreptate să întrebați, ${hi}important este ce vă rămâne. ` +
        (mode === "vanzare"
          ? "La vânzare achitați doar dacă tranzacția se încheie, fără avans. Vreți întâi estimarea gratuită?"
          : mode === "inchiriere"
            ? "La închiriere achitați doar după găsirea chiriașului și semnarea contractului, fără avans. Vreți întâi estimarea gratuită?"
            : "Administrarea este 15–20% doar din încasări, fără abonament. Vreți să vedeți cât v-ar rămâne net?"),
    };
  }

  // 5) Preț — autonomia proprietarului + dovadă pe date reale.
  if (/pret.*(mic|mica|jos|ferm|fix|nenegociabil)|(prea|e) (mic|putin|jos)|sub (pret|piata)|nu (las|scad|negociez)|merita mai mult|vreau mai mult|valoreaza mai mult|pretul (e|este) ferm/.test(t)) {
    return {
      kind: "owner_obj_price",
      text:
        `Desigur, ${hi}decizia rămâne la dumneavoastră. ` +
        (price ? `Pornim de la ${price}. ` : "Pornim de la prețul cerut. ") +
        (mode === "vanzare"
          ? "Vreți să vă trimit comparațiile recente din zonă?"
          : mode === "inchiriere"
            ? "Vreți să vă trimit chiriile recente din zonă?"
            : "Vreți să vă trimit o comparație realistă de venit?"),
    };
  }

  // 6) Are deja pe cineva — retragere elegantă, ușa rămâne deschisă.
  if (/am deja (agent|agentie|administrator|pe cineva)|lucrez deja cu|deja (inchiriat|vandut|dat)/.test(t)) {
    return {
      kind: "owner_obj_already",
      text: `Mulțumesc că mi-ați spus, ${hi}nu insist. Dacă vă ajută cândva o a doua opinie, sunt aici. Mult succes!`,
    };
  }

  // 7) Acord de colaborare — confirmare + următorul pas concret.
  if (/^(da|sigur|ok|bine|de acord|accept)\b.*(colabor|intereseaza|interesat|sunt de acord|hai|putem)|sunt interesat|ma intereseaza|vreau sa colaboram|hai sa colaboram|da,? (ma|sunt)/.test(t)) {
    return {
      kind: "owner_collab_yes",
      text:
        `Mă bucur, ${hi}mulțumesc! Pentru ${ref}` + (price ? ` (${price})` : "") +
        (mode === "vanzare"
          ? " pregătim evaluarea de vânzare."
          : mode === "inchiriere"
            ? " pregătim evaluarea de chirie."
            : " pregătim evaluarea de venit hotelier.") +
        "\n\n" + VIEWING_CLOSE,
    };
  }

  return null;
}


/** Rezumatul unei cereri de apel: subiect, interval și detaliile deja spuse de client. */
export function clientCallSummary(messages: ConversationMessage[], interval: string) {
  const topicKind = [...messages].reverse().find((m) =>
    m.direction === "outbound" && ["client_call_viewing", "client_call_price", "client_call_fee", "client_call_time"].includes(m.tool_call?.auto_reply ?? ""),
  )?.tool_call?.auto_reply ?? "";
  const topic = topicKind === "client_call_viewing" ? "vizionare" : topicKind === "client_call_price" ? "preț" : topicKind === "client_call_fee" ? "comision" : "general";
  return {
    topic,
    interval: interval.trim().slice(0, 80) || null,
    zone: rememberedClientZone(messages),
    rooms: answerAfter(messages, "client_viewing_ask_rooms") ?? answerAfter(messages, "client_obj_followup_rooms"),
    day: answerAfter(messages, "client_viewing_ask_day"),
    time: answerAfter(messages, "client_viewing_ask_time"),
  };
}
