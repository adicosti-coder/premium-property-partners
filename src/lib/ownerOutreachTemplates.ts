/**
 * Șabloane de mesaj către proprietarii găsiți în anunțuri.
 * Se completează automat cu datele proprietarului și ale anunțului,
 * ca administratorul să trimită dintr-o singură apăsare (WhatsApp sau SMS).
 *
 * Reguli obligatorii de conținut:
 *  - se menționează doar administrarea RealTrust 15–20%, fără „cheltuieli ≈27%";
 *  - nu promitem „întâlnire la birou" (nu avem birou pentru clienți) — vizionarea se face la apartament;
 *  - orașul este Timișoara.
 */

/** Semnătura expeditorului în mesajele către proprietari. */
export const SENDER_SHORT = "Andrei de la RealTrust";
export const SENDER_FULL = "Andrei, RealTrust & ApArt Hotel Timișoara";

/** {numar_camere}: „o cameră” / „2 camere”, din numărul de camere al anunțului; gol dacă lipsește. */
export function roomsLabel(rooms?: number | string | null): string {
  const n = Number(String(rooms ?? "").trim());
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) return "";
  return n === 1 ? "o cameră" : `${n} camere`;
}

/** {sursa}: numele portalului din anunț; gol pentru surse generice sau necunoscute. */
export function sourceLabel(platform?: string | null): string {
  const t = String(platform ?? "").trim().toLowerCase();
  if (!t) return "";
  const known: [RegExp, string][] = [
    [/^olx/, "OLX"], [/^storia/, "Storia"], [/^imobiliare/, "Imobiliare.ro"], [/^publi24/, "Publi24"],
    [/marketplace/, "Facebook Marketplace"], [/facebook/, "Facebook"], [/^anuntul/, "Anuntul.ro"],
    [/^bursaimobiliara/, "BursaImobiliara.ro"], [/^homezz/, "Homezz.ro"],
  ];
  return known.find(([re]) => re.test(t))?.[1] ?? "";
}

/**
 * „apartamentul [dumneavoastră] de {numar_camere} din zona {zona}”, cu date din anunț.
 * Fără camere: „apartamentul dumneavoastră din zona X”; fără zonă: „… din Timișoara”.
 */
export function apartmentRef(rooms?: number | string | null, zone?: string | null, possessive = false): string {
  const r = roomsLabel(rooms);
  const z = String(zone ?? "").trim();
  const where = z ? `din zona ${z}` : "din Timișoara";
  if (!r) return `apartamentul dumneavoastră ${where}`;
  return `apartamentul${possessive ? " dumneavoastră" : ""} de ${r} ${where}`;
}

/** Primul mesaj WhatsApp pentru anunțurile de închiriere (sincron cu supabase/functions/_shared/rentalIntroMessage.ts). */
export function rentalFirstMessage(rooms?: number | string | null, zone?: string | null): string {
  return `Bună ziua! Sunt Andrei – RealTrust & ApArt Hotel Timișoara. Vă contactez în legătură cu ${apartmentRef(rooms, zone)}. Oferim servicii complete de administrare în regim hotelier (promovare Booking/Airbnb, curățenie, mentenanță), cu un venit net estimat cu 30-40% mai mare decât chiria clasică. Vă pot trimite gratuit o simulare de randament net pentru zona dumneavoastră?`;
}

export interface OutreachContext {
  ownerName?: string | null;
  title?: string | null;
  zone?: string | null;
  rooms?: number | null;
  price?: number | null;
  currency?: string | null;
  offerPrice?: number | null;
  durationMonths?: number | null;
  platform?: string | null;
}

export interface OutreachTemplate {
  key: string;
  label: string;
  hint: string;
  /** Etapa: primul mesaj sau memento. */
  kind: "first" | "reminder24" | "reminder72";
  build: (ctx: OutreachContext) => string;
}

const money = (value?: number | null, currency?: string | null) => {
  if (value == null || !Number.isFinite(Number(value))) return null;
  const symbol = (currency || "EUR").toUpperCase() === "RON" ? "lei" : "€";
  return `${Math.round(Number(value)).toLocaleString("ro-RO")} ${symbol}`;
};

const greeting = (ctx: OutreachContext) => {
  const name = (ctx.ownerName || "").trim();
  return name ? `Bună ziua, ${name}!` : "Bună ziua!";
};

const listingRef = (ctx: OutreachContext) => {
  const src = sourceLabel(ctx.platform);
  const base = apartmentRef(ctx.rooms, ctx.zone);
  return src ? `${base} publicat pe ${src}` : base;
};

export type ListingTransaction = "vanzare" | "inchiriere" | "necunoscut";

/** Tipul tranzacției din URL, categorie, titlu și descriere (în această ordine). */
export function detectListingTransaction(l: {
  source_url?: string | null; category?: string | null; title?: string | null; description?: string | null;
}): ListingTransaction {
  const fromText = (s?: string | null): ListingTransaction => {
    const t = (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\bnu\s+(?:se\s+)?(?:inchiriez|inchiriaza|vand|vinde)\b/g, "");
    const sale = /vanzare|\bvand\b|\bvinde\b|for-sale/.test(t);
    const rent = /inchiriere|inchiriez|\bchirie\b|(?:de[- ]|se )inchiriat|se inchiriaza|for-rent/.test(t);
    if (sale && !rent) return "vanzare";
    if (rent && !sale) return "inchiriere";
    return "necunoscut";
  };
  for (const s of [l.category, l.title, l.source_url, l.description]) {
    const r = fromText(s);
    if (r !== "necunoscut") return r;
  }
  return "necunoscut";
}

/** Șablonul implicit de prim mesaj după tipul anunțului. */
export const defaultFirstTemplateKey = (tx: ListingTransaction) =>
  tx === "vanzare" ? "first_sale" : "first_management";

/** Textul predefinit din caseta „Mesaj către proprietar" pentru anunțurile de Vânzare:
 *  publicare gratuită pe realtrust.ro + răspuns clar DA/NU pentru acord. */
export const SALE_PUBLISH_TEXT =
  "Bună ziua, am văzut anunțul dumneavoastră și vă propunem promovarea și publicarea gratuită a proprietății pe site-ul nostru. Doriți să o publicăm? Răspundeți cu DA sau NU.";

/** Ce nu are voie să apară într-un mesaj automat pentru un anunț de vânzare. */
export function saleMessageViolations(message: string): string[] {
  const t = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const issues: string[] = [];
  if (/\b\d+\s*luni\b/.test(t)) issues.push("contract pe luni");
  if (/administrare/.test(t)) issues.push("administrare");
  if (/inchiri|chiri/.test(t)) issues.push("închiriere");
  return issues;
}

export const OWNER_OUTREACH_TEMPLATES: OutreachTemplate[] = [
  {
    key: "first_sale",
    label: "Primul mesaj — vânzare",
    hint: "Cere acordul pentru colaborare deschisă (neexclusivă), 0% comision de la proprietar; confirmare simplă sau vizionare.",
    kind: "first",
    build: (ctx) =>
      [
        "Bună ziua! Sunt Andrei, de la RealTrust Timișoara.",
        "",
        `Am văzut anunțul dumneavoastră pentru ${listingRef(ctx)}.`,
        "",
        "Avem clienți cumpărători activi în căutare pe această zonă. Doriți să promovăm și noi proprietatea în regim de colaborare deschisă (neexclusivă), cu 0% comision din partea dumneavoastră?",
        "",
        "Dacă sunteți de acord, ne puteți confirma printr-un simplu răspuns sau ne puteți spune când putem stabili o scurtă vizionare.",
      ].join("\n"),
  },
  {
    key: "first_management",
    label: "Primul mesaj — închiriere (administrare)",
    hint: "Administrare în regim hotelier, venit net estimat cu 30-40% peste chiria clasică; oferă simularea gratuită.",
    kind: "first",
    build: (ctx) => rentalFirstMessage(ctx.rooms, ctx.zone),
  },
  {
    key: "first_rent_offer",
    label: "Primul mesaj — ofertă de închiriere",
    hint: "Cere acordul pentru colaborare deschisă (neexclusivă), 0% comision de la proprietar; confirmare simplă sau vizionare.",
    kind: "first",
    build: (ctx) =>
      [
        "Bună ziua! Sunt Andrei, de la RealTrust Timișoara.",
        "",
        `Am văzut anunțul dumneavoastră pentru ${listingRef(ctx)}.`,
        "",
        "Avem clienți chiriași verificați în căutare pe această zonă. Doriți să promovăm și noi proprietatea în regim de colaborare deschisă (neexclusivă), cu 0% comision din partea dumneavoastră?",
        "",
        "Dacă sunteți de acord, ne puteți confirma printr-un simplu răspuns sau ne puteți spune când putem stabili o vizionare.",
      ].join("\n"),
  },
  {
    key: "first_short",
    label: "Primul mesaj — scurt",
    hint: "Variantă scurtă: estimare gratuită de venit net lunar.",
    kind: "first",
    build: (ctx) =>
      `Bună ziua! Sunt ${SENDER_FULL}. Referitor la ${apartmentRef(ctx.rooms, ctx.zone, true)}: vă putem oferi o estimare gratuită de venit net lunar (regim hotelier / chirie). Vă pot trimite calculul exact pe WhatsApp?`,
  },
  {
    key: "reminder_sale_24h", label: "Memento vânzare 24h", kind: "reminder24",
    hint: "Evaluare și reprezentare la vânzare.",
    build: (ctx) => [greeting(ctx), "", `Sunt ${SENDER_SHORT}. Revin în legătură cu ${listingRef(ctx)}, scos la vânzare.`, "Vă pot trimite evaluarea gratuită și detalii despre reprezentarea la vânzare?"].join("\n"),
  },
  {
    key: "reminder_sale_72h", label: "Memento vânzare 72h", kind: "reminder72",
    hint: "Ultima reamintire despre vânzare.",
    build: (ctx) => [greeting(ctx), "", `Sunt ${SENDER_SHORT}, cu ultimul mesaj despre ${listingRef(ctx)}, scos la vânzare.`, "Mai este disponibil? Dacă doriți o evaluare gratuită sau ajutor la vânzare, vă stau la dispoziție. Mulțumesc!"].join("\n"),
  },
  {
    key: "reminder_24h",
    label: "Memento 24h",
    hint: "Reamintire politicoasă, o zi după primul mesaj.",
    kind: "reminder24",
    build: (ctx) => {
      const offer = money(ctx.offerPrice, ctx.currency);
      return [
        greeting(ctx),
        "",
        `Sunt ${SENDER_SHORT} și revin pe scurt în legătură cu ${listingRef(ctx)}.`,
        offer
          ? `Propunerea rămâne valabilă: ${offer} pe lună, contract semnat și toate cheltuielile de administrare la noi.`
          : "Propunerea rămâne valabilă: venit lunar prin contract și toate cheltuielile de administrare la noi.",
        "Dacă preferați, vă trimit calculul scris, ca să îl citiți în liniște.",
      ].join("\n");
    },
  },
  {
    key: "reminder_72h",
    label: "Memento 72h",
    hint: "Ultima reamintire, la trei zile — cu întrebare de închidere.",
    kind: "reminder72",
    build: (ctx) =>
      [
        greeting(ctx),
        "",
        `Sunt ${SENDER_SHORT}, cu ultimul mesaj legat de ${listingRef(ctx)}.`,
        "Dacă apartamentul este încă disponibil, putem începe chiar săptămâna aceasta; dacă l-ați rezolvat deja, spuneți-mi și nu vă mai deranjez.",
        "Mulțumesc!",
      ].join("\n"),
  },
];

export const getTemplate = (key: string) =>
  OWNER_OUTREACH_TEMPLATES.find((t) => t.key === key) ?? OWNER_OUTREACH_TEMPLATES[0];

export const templatesForKind = (kind: OutreachTemplate["kind"]) =>
  OWNER_OUTREACH_TEMPLATES.filter((t) => t.kind === kind);

/** Număr RO normalizat la +40… (doar mobil, pentru WhatsApp). */
export function normalizeRoPhone(raw?: string | null): string | null {
  if (!raw) return null;
  let d = raw.replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = `40${d.slice(1)}`;
  if (d.startsWith("7") && d.length === 9) d = `40${d}`;
  return /^40\d{9}$/.test(d) ? `+${d}` : null;
}

export const isWhatsappCapable = (phone: string | null) => !!phone && /^\+407\d{8}$/.test(phone);

export const whatsappLink = (phone: string, message: string) =>
  `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;

export const smsLink = (phone: string, message: string) =>
  `sms:${phone}?&body=${encodeURIComponent(message)}`;
