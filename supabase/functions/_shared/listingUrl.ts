// Detectează pagini de căutare/categorie salvate greșit ca anunțuri
// (ex: olx.ro/.../timisoara/q-maria/, storia.ro/ro/rezultate/...).
export function isSearchPageUrl(url: string | null | undefined, title?: string | null): boolean {
  const u = String(url ?? "").toLowerCase();
  if (!u) return false;
  if (/\/d\/oferta\/|\/oferta\/|\/anunt\//.test(u)) return false;
  if (/storia\.ro\/ro\/rezultate\//.test(u)) return true;
  if (/olx\.ro\/(imobiliare|locuri-de-munca)\//.test(u)) return true;
  if (/imobiliare\.ro\/(vanzare|inchiriere)-[a-z-]+\/judetul-/.test(u)) return true;
  if (/[?&](page|search)=|\/q-[^/]+\/?$/.test(u)) return true;
  const t = String(title ?? "").toLowerCase();
  return /anunturi gratuite|descopera ofertele|apartamente de vanzare in zona|cele mai bune oferte|vezi anunturile/.test(t);
}
// Telefon mobil românesc valid (07xxxxxxxx); fixele 02/03 și numerele trunchiate nu sunt contact de proprietar.
export function isRoMobile(phone: string | null | undefined): boolean {
  const d = String(phone ?? "").replace(/\D/g, "").replace(/^0040|^40/, "0");
  return /^07\d{8}$/.test(d);
}
