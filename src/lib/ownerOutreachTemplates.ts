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
  const parts: string[] = [];
  if (ctx.rooms) parts.push(`${ctx.rooms} camere`);
  if (ctx.zone) parts.push(ctx.zone);
  const detail = parts.join(", ");
  const base = detail ? `apartamentul dumneavoastră (${detail})` : "apartamentul dumneavoastră";
  return ctx.platform ? `${base} publicat pe ${ctx.platform}` : base;
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
    hint: "Reprezentare la vânzare și cumpărători/investitori verificați; fără chirie sau administrare.",
    kind: "first",
    build: (ctx) =>
      [
        greeting(ctx),
        "",
        `Sunt Andrei, de la RealTrust Timișoara. Am văzut ${listingRef(ctx)}, scos la vânzare.`,
        "Vă putem ajuta să îl vindeți mai repede, la un preț corect: evaluare pe piața din Timișoara, cumpărători verificați înainte de vizionare și asistență până la semnare. Lucrăm și cu investitori care caută apartamente în zonă.",
        "",
        "Vă trimit o evaluare gratuită?",
      ].join("\n"),
  },
  {
    key: "first_management",
    label: "Primul mesaj — administrare",
    hint: "Prezentare RealTrust și propunere de administrare în regim hotelier.",
    kind: "first",
    build: (ctx) => {
      const offer = money(ctx.offerPrice, ctx.currency);
      const duration = ctx.durationMonths ? `${ctx.durationMonths} luni` : "12 luni";
      return [
        greeting(ctx),
        "",
        `Sunt Andrei, de la RealTrust Timișoara. Am văzut ${listingRef(ctx)} și aș vrea să vă fac o propunere concretă.`,
        offer
          ? `Vă putem prelua apartamentul în administrare cu un venit estimat de ${offer} pe lună, pe un contract de ${duration}.`
          : `Vă putem prelua apartamentul în administrare pe un contract de ${duration}, cu un venit lunar garantat prin contract.`,
        "Ne ocupăm de tot: promovare, oaspeți, curățenie, mentenanță și încasări. Comisionul de administrare RealTrust este între 15% și 20%, în funcție de pachetul ales.",
        "",
        "Dacă vă interesează, vin la apartament la o oră care vă e comodă și vă arăt calculul exact. Vă convine?",
      ].join("\n");
    },
  },
  {
    key: "first_rent_offer",
    label: "Primul mesaj — ofertă de închiriere",
    hint: "Ofertă directă de închiriere pe termen lung, fără comision de la proprietar.",
    kind: "first",
    build: (ctx) => {
      const offer = money(ctx.offerPrice, ctx.currency);
      const asking = money(ctx.price, ctx.currency);
      const duration = ctx.durationMonths ? `${ctx.durationMonths} luni` : "12 luni";
      return [
        greeting(ctx),
        "",
        `Sunt Andrei, de la RealTrust Timișoara, în legătură cu ${listingRef(ctx)}.`,
        offer
          ? `Vă propunem închirierea pe ${duration}, cu ${offer} pe lună, plata la dată fixă și contract semnat.`
          : `Vă propunem închirierea pe ${duration}, cu plata la dată fixă și contract semnat.`,
        asking && offer ? `Prețul cerut în anunț este ${asking}, deci suntem foarte aproape.` : "",
        "Nu percepem comision de la dumneavoastră și ne ocupăm noi de întreținerea apartamentului.",
        "",
        "Putem stabili o vizionare la apartament în următoarele zile?",
      ]
        .filter(Boolean)
        .join("\n");
    },
  },
  {
    key: "first_short",
    label: "Primul mesaj — scurt",
    hint: "Variantă foarte scurtă, pentru SMS.",
    kind: "first",
    build: (ctx) =>
      [
        greeting(ctx),
        `Sunt Andrei, RealTrust Timișoara, despre ${listingRef(ctx)}.`,
        "Avem o propunere de administrare cu venit lunar garantat prin contract. Vă pot trimite calculul exact?",
      ].join(" "),
  },
  {
    key: "reminder_sale_24h", label: "Memento vânzare 24h", kind: "reminder24",
    hint: "Evaluare și reprezentare la vânzare.",
    build: (ctx) => [greeting(ctx), "", `Revin în legătură cu ${listingRef(ctx)}, scos la vânzare.`, "Vă pot trimite evaluarea gratuită și detalii despre reprezentarea la vânzare?"].join("\n"),
  },
  {
    key: "reminder_sale_72h", label: "Memento vânzare 72h", kind: "reminder72",
    hint: "Ultima reamintire despre vânzare.",
    build: (ctx) => [greeting(ctx), "", `Ultimul mesaj despre ${listingRef(ctx)}, scos la vânzare.`, "Mai este disponibil? Dacă doriți o evaluare gratuită sau ajutor la vânzare, vă stau la dispoziție. Mulțumesc!"].join("\n"),
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
        `Revin pe scurt în legătură cu ${listingRef(ctx)}.`,
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
        `Sunt Andrei, de la RealTrust Timișoara — ultimul mesaj legat de ${listingRef(ctx)}.`,
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
