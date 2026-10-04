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
      text:
        "Am înțeles, vă mulțumim pentru răspuns și nu vă mai deranjăm. " +
        "Dacă vreodată vă ajută o estimare de preț sau de venit, ne scrieți oricând aici. O zi frumoasă!",
    };
  }

  if (/vanzare/.test(t)) {
    return {
      kind: "quick_sale",
      text:
        "Perfect! La vânzare ne ocupăm de tot: evaluare gratuită, poze profesionale, promovare, " +
        "doar cumpărători verificați la vizionări și actele până la notar.\n\n" +
        "Ca să vă trimit estimarea de preț, câte camere are apartamentul și în ce zonă e?",
    };
  }
  if (/inchiriere clasica/.test(t)) {
    return {
      kind: "quick_classic_rent",
      text:
        "Perfect! La închiriere găsim chiriași verificați, facem contractul și ne ocupăm de relația cu ei, " +
        "ca să încasați liniștit, fără luni de gol.\n\n" +
        "Ca să vă trimit estimarea de chirie, câte camere are apartamentul și în ce zonă e?",
    };
  }
  if (/administrare|hotel/.test(t)) {
    return {
      kind: "quick_management",
      text:
        "Excelent! În regim hotelier ne ocupăm noi de tot — Booking, Airbnb, prețuri dinamice, oaspeți, " +
        "curățenie — iar dumneavoastră primiți venitul și un raport lunar. Randamentul net estimat e de circa 9,4% pe an.\n\n" +
        "Ca să vă calculez venitul lunar, câte camere are apartamentul și în ce zonă e?\n\n" + FINANCE_BLOCK,
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
  const owner = ownerReplyText(raw, ctx);
  if (owner) return owner;
  if (quick) return quick;

  const t = stripDiacritics(raw);
  if (!t) return null;

  if (/^stop\b|nu mai (vreau|doresc)|dezabon/.test(t)) {
    return {
      kind: "quick_stop",
      text:
        "Am înțeles, nu vă mai trimitem mesaje. Vă mulțumim pentru timpul acordat! " +
        "Dacă aveți nevoie de noi pe viitor, ne scrieți oricând aici.",
    };
  }

  if (/property management|ce include administrarea|ce faceti pentru|ce servicii|cu ce va ocupati|ce intra in administrare/.test(t)) {
    return {
      kind: "auto_property_management",
      text:
        "Pe scurt: dumneavoastră încasați, noi ne ocupăm de tot.\n" +
        "• Anunțuri pe Booking, Airbnb și Expedia, cu prețuri dinamice.\n" +
        "• Oaspeți, check-in automat, curățenie, lenjerie și mentenanță.\n" +
        "• Raport financiar lunar, ca să vedeți exact cifrele.\n\n" +
        "Administrarea e 15–20% doar din încasări — dacă apartamentul nu produce, nu plătiți nimic.\n\n" +
        "Vreți să vă calculez venitul pentru apartamentul dumneavoastră? Îmi spuneți doar zona și numărul de camere.",
    };
  }

  if (/comision|cat luati|cat retineti|ce procent|procentul|taxa voastra|cat costa administrarea/.test(t)) {
    return {
      kind: "auto_fee",
      text:
        "Transparent: administrarea RealTrust e 15–20% din încasări, în funcție de apartament. " +
        "Se aplică doar pe venitul realizat — fără abonament și fără costuri în avans.\n\n" +
        "Include anunțurile, prețurile dinamice, oaspeții, check-in-ul, curățenia, mentenanța și raportul lunar.\n\n" +
        "Vreți să vedeți cât v-ar rămâne net pentru apartamentul dumneavoastră? Îmi spuneți zona și numărul de camere.",
    };
  }

  if (/profit|cat imi ramane|cat castig|cat scot|randament net|venit net|net pe luna/.test(t)) {
    return {
      kind: "auto_profit",
      text:
        "Media e un profit net de circa 9,4% pe an din valoarea apartamentului — cifra exactă depinde de ocuparea reală.\n\n" +
        FINANCE_BLOCK + "\n\n" +
        "Vă calculez cifra exactă pentru apartamentul dumneavoastră? Îmi spuneți zona și numărul de camere.",
    };
  }

  if (/^2\b|^3\b|imobiliar|vand|cumpar|achizi|inchiri/.test(t)) {
    return {
      kind: "auto_real_estate",
      text:
        "Perfect, vă ajutăm cu vânzarea, cumpărarea sau închirierea în Timișoara.\n\n" +
        "Ca să pornim corect: e vorba de vânzare sau de închiriere, și în ce zonă?",
    };
  }

  if (/^1\b|regim hotelier|management|randament|venit/.test(t)) {
    return {
      kind: "auto_management",
      text:
        "Excelent! În regim hotelier randamentul net estimat e de circa 9,4% pe an, iar noi ne ocupăm de tot: " +
        "Booking, Airbnb, prețuri dinamice, oaspeți, curățenie și raport lunar.\n\n" +
        "Ca să vă calculez venitul lunar, câte camere are apartamentul și în ce zonă e?\n\n" +
        FINANCE_BLOCK,
    };
  }

  if (/rezerv|cazare|noapte|nopti|check.?in|disponibil/.test(t)) {
    return {
      kind: "auto_booking",
      text:
        "Cu plăcere! Disponibilitatea și prețurile le vedeți aici: https://realtrust.ro/rezervare\n\n" +
        "Sau îmi spuneți perioada și câte persoane sunteți, și vă propun eu apartamentul potrivit.",
    };
  }

  if (/dupa oferta|ce urmeaza|urmeaza dupa|pasii urmatori|ce se intampla|cum continua|dupa ce accept/.test(t)) {
    return {
      kind: "auto_after_offer",
      text:
        "Pașii sunt simpli și clari:\n" +
        "1) Vizionare la apartament (luni–sâmbătă, 09:00–20:00).\n" +
        "2) Negociere — transmitem oferta și revenim cu răspunsul.\n" +
        "3) Antecontract — avans și termene, cu actele verificate.\n" +
        "4) Notar — semnare, plată și predarea cheilor.\n" +
        "5) Opțional, preluăm administrarea în regim hotelier.\n\n" +
        "Până la antecontract nu aveți nicio obligație. Vă e mai comodă o vizionare în timpul săptămânii sau sâmbătă?",
    };
  }

  if (/pret|preț|cat cost|cat face|valoare|estimare|oferta/.test(t)) {
    return {
      kind: "auto_price",
      text:
        "Vă trimit cifrele reale, gratuit și fără obligații. " +
        "Câte camere are apartamentul și în ce zonă e?\n\n" + FINANCE_BLOCK,
    };
  }

  if (/vizionare|vizite|vizit[ăa]|sa vad|vedem|intalni|cand pot veni|programare|programam/.test(t)) {
    return {
      kind: "auto_meeting",
      text:
        "Sigur! Vizionarea se face direct la apartament, durează circa 30 de minute și nu vă obligă la nimic.\n\n" +
        "Ce vă e mai comod: în timpul săptămânii sau sâmbătă? Vă confirmăm imediat adresa și ora.",
    };
  }

  return null;
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
  "Cel mai simplu e să vedem apartamentul 20 de minute, fără nicio obligație. " +
  "Vă e mai comod mâine sau poimâine (09:00–20:00)?";

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
      return `Pentru ${ref} vă trimit gratuit o estimare de preț de vânzare, ` +
        "cu comparații pe vânzările recente din zonă, ca să aveți o cifră reală de comparație.";
    case "inchiriere":
      return `Pentru ${ref} vă trimit gratuit o estimare de chirie pe termen lung, ` +
        "cu chiriași verificați și contract solid, ca să știți exact cât puteți încasa lunar.";
    case "hotelier":
      return `Pentru ${ref} vă trimit gratuit o estimare de venit în regim hotelier ` +
        "(randament net circa 9,4% pe an), ca să comparați cu închirierea clasică.";
    default:
      return `Pentru ${ref} vă trimit gratuit o estimare de preț și de chirie, ca să aveți o cifră de comparat.`;
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
      text:
        `Super, ${hi}mulțumesc! Venim noi la ${ref}, durează 20–30 de minute și nu vă obligă la nimic.\n\n` +
        "Ce vă e mai comod: dimineața (09–13) sau după-amiaza (14–20)? " +
        "Un coleg vă confirmă personal ora exactă.",
    };
  }

  // 2) Cerere de apel — confirmăm și cerem doar intervalul preferat.
  if (/sunati|suna-ma|sunati-ma|ma puteti suna|un telefon|apelati|vorbim la telefon|prefer telefon/.test(t)) {
    return {
      kind: "owner_call_request",
      text:
        `Sigur, ${hi}vă sună un coleg RealTrust astăzi, între 09:00 și 20:00. ` +
        "Vă convine mai mult înainte de prânz sau după?",
    };
  }

  // 3) „Nu lucrez cu agenții” — validare, reducerea riscului, pas mic.
  if (/nu (colaborez|lucrez|vreau|doresc)\s+(cu\s+)?(agenti|agentii|agentie|intermediar)|fara agent|fara intermediar|nu vreau agentie/.test(t)) {
    return {
      kind: "owner_obj_agency",
      text:
        `Vă înțeleg perfect, ${hi}și e o decizie bună să fiți atent(ă). ` +
        "La noi nu există exclusivitate și nici contract lung — rămâneți liber(ă) să vindeți sau să închiriați singur(ă).\n\n" +
        modeValueLine(mode, ref) + "\n\n" +
        "Fără nicio obligație — v-o trimit aici?",
    };
  }

  // 4) Comision — validare, risc zero, valoare concretă, apoi pas mic.
  if (/comision.*(mare|mult|scump)|(mare|mult|scump).*comision|nu (platesc|dau|vreau) comision|fara comision|prea scump|prea mult/.test(t)) {
    return {
      kind: "owner_obj_fee",
      text:
        `Întrebare foarte corectă, ${hi}contează ce vă rămâne în buzunar, nu procentul. ` +
        (mode === "vanzare"
          ? "La vânzare plătiți doar dacă se vinde, o singură dată, la notar — nimic în avans.\n\n" +
            "Noi filtrăm cumpărătorii, ne ocupăm de vizionări și de acte, ca să vindeți mai repede și fără bătăi de cap."
          : mode === "inchiriere"
            ? "La închiriere plătiți o singură dată, doar după ce avem chiriașul verificat și contractul semnat — nimic în avans.\n\n" +
              "Noi verificăm chiriașii și facem contractul, ca să nu riscați restanțe sau luni fără chirie."
            : "Administrarea e 15–20% și se aplică doar pe încasări — dacă apartamentul nu produce, nu plătiți nimic. " +
              "Fără abonament, fără costuri ascunse.\n\n" +
              "Prețurile dinamice și ocuparea mai mare acoperă de obicei diferența, iar dumneavoastră nu vă mai ocupați de nimic.") +
        "\n\n" + VIEWING_CLOSE,
    };
  }

  // 5) Preț — autonomia proprietarului + dovadă pe date reale.
  if (/pret.*(mic|mica|jos|ferm|fix|nenegociabil)|(prea|e) (mic|putin|jos)|sub (pret|piata)|nu (las|scad|negociez)|merita mai mult|vreau mai mult|valoreaza mai mult|pretul (e|este) ferm/.test(t)) {
    return {
      kind: "owner_obj_price",
      text:
        `Absolut, ${hi}prețul îl decideți dumneavoastră. ` +
        (price ? `Pornim de la ${price}, cât ați cerut în anunț. ` : "Pornim de la prețul cerut de dumneavoastră. ") +
        (mode === "vanzare"
          ? `Vă arătăm doar ce s-a vândut recent, similar cu ${ref}, ca să aveți argumente la negociere.`
          : mode === "inchiriere"
            ? `Vă arătăm la ce chirii s-au închiriat recent apartamente similare cu ${ref}, ca să încasați fără luni de gol.`
            : `Vă arătăm veniturile reale în regim hotelier pentru apartamente similare cu ${ref}, ca să comparați pe cifre.`) +
        "\n\n" + VIEWING_CLOSE,
    };
  }

  // 6) Are deja pe cineva — retragere elegantă, ușa rămâne deschisă.
  if (/am deja (agent|agentie|administrator|pe cineva)|lucrez deja cu|deja (inchiriat|vandut|dat)/.test(t)) {
    return {
      kind: "owner_obj_already",
      text:
        `Mulțumesc că mi-ați spus, ${hi}nu insist și vă doresc mult succes! ` +
        (mode === "vanzare"
          ? "Dacă vreți vreodată o a doua părere pe preț, ne scrieți aici. O zi frumoasă!"
          : mode === "inchiriere"
            ? "Dacă vreți vreodată o a doua părere pe chirie sau pe venitul în regim hotelier, ne scrieți aici. O zi frumoasă!"
            : "Dacă vreți vreodată o a doua părere pe venitul în regim hotelier, ne scrieți aici. O zi frumoasă!"),
    };
  }

  // 7) Acord de colaborare — confirmare + următorul pas concret.
  if (/^(da|sigur|ok|bine|de acord|accept)\b.*(colabor|intereseaza|interesat|sunt de acord|hai|putem)|sunt interesat|ma intereseaza|vreau sa colaboram|hai sa colaboram|da,? (ma|sunt)/.test(t)) {
    return {
      kind: "owner_collab_yes",
      text:
        `Mă bucur, ${hi}mulțumesc! Pentru ${ref}` + (price ? ` (${price})` : "") +
        (mode === "vanzare"
          ? " pregătim evaluarea gratuită de preț de vânzare."
          : mode === "inchiriere"
            ? " pregătim evaluarea gratuită de chirie."
            : " pregătim evaluarea gratuită de venit în regim hotelier.") +
        "\n\n" + VIEWING_CLOSE,
    };
  }

  return null;
}
