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

/** Primul mesaj WhatsApp pentru anunțurile de închiriere (sincron cu supabase/functions/_shared/rentalIntroMessage.ts). */
export function rentalFirstMessage(rooms?: number | string | null, zone?: string | null): string {
  const r = rooms != null && String(rooms).trim() !== "" && Number(rooms) > 0 ? String(Number(rooms)) : "";
  const z = (zone ?? "").trim();
  const ref = r && z ? `apartamentul cu ${r} camere din ${z}` : "apartamentul dumneavoastră din Timișoara";
  return [
    `Bună ziua! Sunt Andrei de la RealTrust Timișoara. Am văzut anunțul dumneavoastră pentru ${ref}, propus spre închiriere.`,
    "",
    "Preluăm apartamente în administrare completă în Timișoara (regim hotelier sau hibrid). Scopul este un venit net estimat mai bun decât chiria clasică, fără grija chiriașilor rău-platnici.",
    "",
    "Ne ocupăm de:",
    "• promovare pe Booking, Airbnb și realtrust.ro",
    "• curățenie profesională, lenjerii și verificarea oaspeților",
    "• mentenanță curentă",
    "",
    "Vă pot trimite gratuit o simulare de randament net pentru zona dumneavoastră. Pot trece și 15 minute pe la apartament să vă prezint opțiunile.",
    "",
    "Când v-ar fi mai comod să discutăm: azi spre seară sau mâine? Dacă nu vă interesează, răspundeți NU și nu vă mai deranjăm.",
  ].join("\n");
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
    hint: "Ofertare deschisă: oferte scrise după vizionări, prag minim stabilit de proprietar; DA = vrea să discute.",
    kind: "first",
    build: (ctx) =>
      [
        greeting(ctx),
        "",
        `Sunt Andrei, de la RealTrust Timișoara. Am văzut anunțul pentru ${listingRef(ctx)}.`,
        "Cea mai grea decizie la vânzare este prețul. Nu lăsați primul cumpărător care vă face o ofertă să decidă cât valorează proprietatea dumneavoastră.",
        "",
        "Prin ofertarea deschisă, după vizionări fiecare cumpărător trimite o ofertă scrisă. Dumneavoastră stabiliți pragul minim, vedeți toate ofertele și decideți, fără nicio obligație.",
        "",
        "Doriți să discutăm dacă această strategie se potrivește proprietății dumneavoastră? Răspundeți cu DA, sau NU dacă nu doriți să vă mai contactăm.",
      ].join("\n"),
  },
  {
    key: "first_management",
    label: "Primul mesaj — închiriere (administrare)",
    hint: "Prezentare administrare regim hotelier/hibrid; zonă/camere cu text de rezervă; NU = opt-out.",
    kind: "first",
    build: (ctx) => rentalFirstMessage(ctx.rooms, ctx.zone),
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
