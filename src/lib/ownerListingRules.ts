import { norm } from "@/lib/portalSearch";

export type OwnerVerification = "confirmed" | "review" | "agency";

export interface OwnerListingCandidate {
  title?: string | null;
  description?: string | null;
  url?: string | null;
  phone?: string | null;
  prospect_type?: string | null;
  owner_verified?: boolean | null;
  is_active?: boolean | null;
  lifecycle_status?: string | null;
}

const TRACKING_PARAMS = /^(utm_|gclid|fbclid|msclkid|reason|ref|source|srsltid|_ga|mc_|sid|clickid)/i;

const AGENCY_SIGNALS = [
  "agentie imobiliara", "agent imobiliar", "consultant imobiliar", "broker imobiliar",
  "comision agentie", "comision cumparator", "comision chirias", "reprezentare exclusiva",
  "intermediere imobiliara", "portofoliu", "cod oferta", "id oferta", "va propunem",
  "va oferim spre", "echipa noastra", "birou imobiliar", "real estate srl", "imobiliare srl",
  "blitz", "property lab", "apostu estate", "primum imobiliare", "foxfort", "imobilliare",
  "sedako", "eugene estate", "golden real estate", "district real estate", "evolution imobiliare",
] as const;

const OWNER_SIGNALS = [
  "direct proprietar", "direct de la proprietar", "persoana fizica", "persoana privata",
  "fara agentie", "fara comision", "proprietar vand", "proprietar inchiriez",
  "vand apartament personal", "inchiriez apartament personal",
] as const;

const OFF_TOPIC_SIGNALS = [
  "taxi", "licenta taxi", "autorizatie taxi", "vand afacere", "afacere la cheie", "srl",
  "autoturism", "remorca", "tractor", "utilaj", "loc de munca", "angajez", "cazare",
  "regim hotelier", "pe noapte", "camera de hotel", "publicitate", "panou publicitar",
] as const;

const REAL_ESTATE_SIGNALS = [
  "apartament", "garsoniera", "casa", "vila", "duplex", "penthouse", "locuinta", "bloc",
  "mansarda", "teren", "camere", "camera", "mp", "m2", "decomandat", "semidecomandat",
  "nedecomandat", "etaj", "parter", "dormitor", "living",
] as const;

export function normalizeOwnerListingUrl(raw: string | null | undefined): string {
  const value = (raw || "").trim();
  if (!value) return "";
  try {
    const url = new URL(value);
    const kept = new URLSearchParams();
    url.searchParams.forEach((paramValue, key) => {
      if (!TRACKING_PARAMS.test(key)) kept.append(key, paramValue);
    });
    url.search = kept.toString();
    url.hash = "";
    url.hostname = url.hostname.replace(/^www\./i, "").toLowerCase();
    const path = url.pathname.replace(/\/+$/, "");
    return `${url.protocol}//${url.hostname}${path}${url.search ? `?${url.search}` : ""}`;
  } catch {
    return value.replace(/[#?].*$/, "").replace(/\/+$/, "");
  }
}

export function isIndividualOwnerListing(candidate: OwnerListingCandidate): boolean {
  const clean = normalizeOwnerListingUrl(candidate.url);
  if (!clean) return false;
  let host = "";
  let path = clean;
  let query = "";
  try {
    const parsed = new URL(clean);
    host = parsed.hostname;
    path = parsed.pathname.toLowerCase();
    query = parsed.search.toLowerCase();
  } catch {
    return false;
  }

  if (/(q=|query=|search=|filtr|page=|pagina=|categor|pret=|price=|camere=)/.test(query)) return false;
  if (/(\/caut|\/search|\/rezultate|\/results|\/filtr|\/categorie|\/category|\/sitemap|\/q(?:-|\/))/.test(path)) return false;

  const knownPattern =
    (/(^|\.)olx\.ro$/.test(host) && /\/d\/oferta\/.+-id[a-z0-9]+\.html?$/i.test(path)) ||
    (/(^|\.)storia\.ro$/.test(host) && /\/ro\/oferta\/.+-id[a-z0-9_-]+$/i.test(path)) ||
    (/(^|\.)imobiliare\.ro$/.test(host) && (/\/oferta\//.test(path) || /-\d{6,}$/.test(path))) ||
    (/(^|\.)publi24\.ro$/.test(host) && /\/anunturi\/.+\/anunt\/.+/i.test(path)) ||
    (/(^|\.)bursaimobiliara\.ro$/.test(host) && /-\d+\.html?$/i.test(path));
  if (knownPattern) return true;

  const last = path.split("/").filter(Boolean).pop()?.replace(/\.(html?|php|aspx?)$/, "") || "";
  return /\d{5,}/.test(last) || /-[a-z0-9]{8,}$/i.test(last) || /id[a-z0-9]{5,}/i.test(last);
}

export function hasAgencyEvidence(candidate: OwnerListingCandidate): boolean {
  if (norm(candidate.prospect_type) === "agentie") return true;
  const text = ` ${norm(`${candidate.title || ""} ${candidate.description || ""}`)} `;
  return AGENCY_SIGNALS.some((signal) => text.includes(` ${norm(signal)} `));
}

export function hasOwnerEvidence(candidate: OwnerListingCandidate): boolean {
  // Historic rows were often labelled `proprietar` only because the outgoing
  // search query contained that word. That label alone is not evidence.
  if (candidate.owner_verified === true) return true;
  const text = ` ${norm(`${candidate.title || ""} ${candidate.description || ""}`)} `;
  return OWNER_SIGNALS.some((signal) => text.includes(` ${norm(signal)} `));
}

export function ownerVerification(candidate: OwnerListingCandidate): OwnerVerification {
  if (hasAgencyEvidence(candidate)) return "agency";
  return hasOwnerEvidence(candidate) ? "confirmed" : "review";
}

export function isActiveOwnerListing(candidate: OwnerListingCandidate): boolean {
  if (candidate.is_active === false) return false;
  return !["expired", "rejected"].includes(norm(candidate.lifecycle_status));
}

export function isResidentialRealEstate(candidate: OwnerListingCandidate): boolean {
  const text = ` ${norm(`${candidate.title || ""} ${candidate.description || ""}`)} `;
  if (OFF_TOPIC_SIGNALS.some((signal) => text.includes(` ${norm(signal)} `))) return false;
  return REAL_ESTATE_SIGNALS.some((signal) => text.includes(` ${norm(signal)} `));
}

export function listingTransaction(candidate: OwnerListingCandidate): "vanzare" | "inchiriere" | null {
  const text = ` ${norm(`${candidate.title || ""} ${candidate.description || ""}`)} `;
  if (/\b(inchiriez|inchiriere|inchiriat|se inchiriaza|ofer spre inchiriere|chirie|lunar)\b/.test(text)) {
    return "inchiriere";
  }
  if (/\b(vand|vanzare|de vanzare|se vinde|ofer spre vanzare)\b/.test(text)) return "vanzare";
  return null;
}