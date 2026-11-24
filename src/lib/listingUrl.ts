// Detectează pagini de căutare/categorie, agregatoare și articole salvate greșit ca anunțuri
// (ex: olx.ro/.../timisoara/q-maria/, storia.ro/ro/rezultate/..., laproprietar.ro/imobiliare/...).
// Oglindit în supabase/functions/_shared/listingUrl.ts — păstrează cele două fișiere identice.

/** Litere mici, fără diacritice (ă/â/î/ș/ş/ț/ţ), spații simple. */
const fold = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

/** Adresa unui anunț individual pe portalurile cunoscute. */
const INDIVIDUAL_URL = /\/d\/oferta\/|\/oferta\/|\/anunt\/|facebook\.com\/marketplace\/item\/\d+|facebook\.com\/groups\/[^/]+\/(posts|permalink)\/\d+|\/rooms\/\d+/;

/** Slug cu ID numeric de anunț (ex. …-2721637, …-4077154.html): pagina unui singur imobil. */
const LISTING_ID_SLUG = /[-_]\d{4,}(\.html?|\.php)?\/?(\?|$)/;

/** Site-uri care nu publică anunțuri individuale de proprietari (statistici, calculatoare, motoare de căutare). */
const NON_LISTING_HOSTS = /(^|\.)(hartapreturilor\.ro|calculatorfiscal\.ro|bing\.com|google\.[a-z.]+)$/;

const SEARCH_URL_PATTERNS: RegExp[] = [
  /storia\.ro\/(ro\/)?rezultate\//,
  /olx\.ro\/(imobiliare|locuri-de-munca)\//,
  /imobiliare\.ro\/(vanzare|inchiriere|inchirieri)-[a-z-]+\/(judetul-|timisoara)/,
  /imoradar24\.ro\/[a-z-]+-de-(vanzare|inchiriat)\//,
  /laproprietar\.ro\/imobiliare(\/|$)/,
  /renthero\.ro\/inchirieri(\/|$)/,
  /facebook\.com\/marketplace\/(?!item\/)/,
  /publi24\.ro\/(?!.*\/anunt\/)/,
  /okazii\.ro\/cautare(\/|$)/,
  /imobiliare\.ro\/(tip|imoexpert|ansamblu-rezidential)\//,
  /storia\.ro\/(ro\/)?(companii|imobiliare|ansamblu)\//,
  /lajumate\.ro\/anunturi\/[^?]*\/in\//,
  /timisoreni\.ro\/(info|harta)\//,
  /\/(blog|stiri|articole?)\//,
  /\/(cautare|search|rezultate)(\/|$)/,
  /\/page\/\d+\/?$/,
  /[?&](q|query|search|keyword|keywords|page|pag)=/,
  /\/q-[^/]+\/?$/,
];

const SEARCH_TITLE_PATTERNS: RegExp[] = [
  // Titluri la plural: „Apartamente de vânzare și de închiriat…”, „Case de vânzare…”, „Garsoniere de închiriat…”
  /\b(apartamente|garsoniere|garsoneire|case|vile|penthouses?|terenuri|proprietati|locuinte|imobile)( noi)?( cu \d+ camere)? (de|la) (vanzare|inchiriat|inchiriere)\b/,
  // „557 anunțuri apartamente…”, „12 apartamente de închiriat…”, „927 garsoniere proprietar…”
  /^\d[\d.,]*\+? (anunturi|oferte|apartamente|garsoniere|garsoneire|case|vile|terenuri|proprietati|locuinte)\b/,
  /\banunturi (imobiliare|gratuite)\b/,
  /\bnew and used .* for sale\b/,
  /\bproperty for sale in\b/,
  /\bmarketplace - buy and sell\b/,
  /\bevolutie(a)? preturi(lor)?\b|\bevolutia preturilor\b/,
  /\bindice(le)? imobiliar\b/,
  /\bpiata imobiliara\b/,
  /\bcalculator (roi|randament)\b/,
  /^top \d+ /,
  /descopera ofertele|apartamente de vanzare in zona|cele mai bune oferte|vezi anunturile/,
];

export function isSearchPageUrl(url: string | null | undefined, title?: string | null): boolean {
  const u = String(url ?? "").trim().toLowerCase();
  if (!u) return false;
  if (INDIVIDUAL_URL.test(u)) return false;
  let host = "";
  try { host = new URL(u).hostname.replace(/^www\./, ""); } catch { /* adresă invalidă: doar regulile de text */ }
  if (host && NON_LISTING_HOSTS.test(host)) return true;
  if (SEARCH_URL_PATTERNS.some((re) => re.test(u))) return true;
  // Un anunț cu ID propriu rămâne anunț chiar dacă titlul portalului e la plural.
  if (LISTING_ID_SLUG.test(u)) return false;
  const t = fold(String(title ?? ""));
  return !!t && SEARCH_TITLE_PATTERNS.some((re) => re.test(t));
}

// Telefon mobil românesc valid (07xxxxxxxx); fixele 02/03 și numerele trunchiate nu sunt contact de proprietar.
export function isRoMobile(phone: string | null | undefined): boolean {
  const d = String(phone ?? "").replace(/\D/g, "").replace(/^0040|^40/, "0");
  return /^07\d{8}$/.test(d);
}
