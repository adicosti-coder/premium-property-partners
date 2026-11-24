import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { isSearchPageUrl, isRoMobile } from "./listingUrl";

describe("isSearchPageUrl — pagini de căutare și categorii", () => {
  it("portalurile mari: OLX, Storia, Imobiliare.ro", () => {
    expect(isSearchPageUrl("https://www.olx.ro/imobiliare/apartamente-garsoniere-de-vanzare/timisoara/q-maria/")).toBe(true);
    expect(isSearchPageUrl("https://www.storia.ro/ro/rezultate/inchiriere/apartament/timis/timisoara/fabric")).toBe(true);
    expect(isSearchPageUrl("https://www.imobiliare.ro/vanzare-apartamente/judetul-timis/timisoara/braytim")).toBe(true);
    expect(isSearchPageUrl("https://www.imobiliare.ro/inchirieri-apartamente/judetul-timis/timisoara/ultracentral")).toBe(true);
  });
  it("laproprietar, renthero, hartapreturilor, calculatorfiscal", () => {
    expect(isSearchPageUrl("https://laproprietar.ro/imobiliare/timisoara", "Apartamente de vânzare și de închiriat în Timișoara — de la proprietar")).toBe(true);
    expect(isSearchPageUrl("https://renthero.ro/inchirieri/timisoara")).toBe(true);
    expect(isSearchPageUrl("https://hartapreturilor.ro/evolutie-preturi/timisoara")).toBe(true);
    expect(isSearchPageUrl("https://calculatorfiscal.ro/calculator-roi-imobiliar")).toBe(true);
  });
  it("Facebook Marketplace: căutări și categorii, nu anunțurile /item/", () => {
    expect(isSearchPageUrl("https://www.facebook.com/marketplace/115598971786121/search/?query=locuinte")).toBe(true);
    expect(isSearchPageUrl("https://www.facebook.com/marketplace/category/propertyrentals")).toBe(true);
    expect(isSearchPageUrl("https://m-fallback.facebook.com/marketplace/108421799182994/propertyforsale/")).toBe(true);
    expect(isSearchPageUrl("https://www.facebook.com/marketplace/item/917819274188591/?ref=newsfeed", "Vând apartament 2 camere")).toBe(false);
  });
  it("Publi24 cu ?q= sau /cautare/, Okazii /cautare/", () => {
    expect(isSearchPageUrl("https://www.publi24.ro/anunturi/imobiliare/?q=fara+agentii")).toBe(true);
    expect(isSearchPageUrl("https://www.publi24.ro/cautare/?q=apartament")).toBe(true);
    expect(isSearchPageUrl("https://www.publi24.ro/anunturi/imobiliare/de-vanzare/apartamente/timis/giroc/")).toBe(true);
    expect(isSearchPageUrl("https://www.okazii.ro/cautare/apartament+timisoara.html")).toBe(true);
  });
  it("parametri de căutare sau paginare în adresă", () => {
    expect(isSearchPageUrl("https://exemplu.ro/imobile?query=timisoara")).toBe(true);
    expect(isSearchPageUrl("https://exemplu.ro/apartamente?page=3")).toBe(true);
    expect(isSearchPageUrl("https://exemplu.ro/apartamente/page/2/")).toBe(true);
  });
});

describe("isSearchPageUrl — titluri generice (cu sau fără diacritice)", () => {
  const site = "https://exemplu.ro/listare";
  it.each([
    "Apartamente de vânzare și de închiriat în Timișoara — de la proprietar",
    "Apartamente de vanzare si de inchiriat in Timisoara",
    "12 apartamente de închiriat în Timișoara",
    "557 anunturi apartamente din Timisoara cu 3 camere - Timisoreni.ro",
    "Case de vânzare în Timişoara | Facebook",
    "Anunțuri imobiliare Timișoara",
    "New and used Vânzări Locuinţe for sale | Facebook Marketplace",
    "Evoluție prețuri imobiliare Timișoara 2026",
    "Indice imobiliar Timișoara",
    "Piața imobiliară din Timișoara",
    "apartamente vanzare Timisoara - Anunțuri gratuite - OLX.ro",
  ])("%s", (title) => expect(isSearchPageUrl(site, title)).toBe(true));
});

describe("isSearchPageUrl — anunțurile individuale rămân", () => {
  it("adrese de anunț pe portaluri", () => {
    expect(isSearchPageUrl("https://www.olx.ro/d/oferta/apartament-2-camere-IDabc.html")).toBe(false);
    expect(isSearchPageUrl("https://www.storia.ro/ro/oferta/apartament-3-camere-IDx")).toBe(false);
    expect(isSearchPageUrl("https://homezz.ro/apartament-cu-3-camere-giroc-4077154.html")).toBe(false);
    expect(isSearchPageUrl("https://www.publi24.ro/anunturi/imobiliare/de-vanzare/apartamente/apartamente-2-camere/anunt/ap-2-camere/abc123.html")).toBe(false);
    expect(isSearchPageUrl("https://www.facebook.com/groups/apartamentetimisoara/posts/25900792246255069/", "Apartamente de vanzare Timisoara - Facebook")).toBe(false);
  });
  it("un anunț cu ID propriu nu e respins pentru titlul la plural al portalului", () => {
    expect(isSearchPageUrl("https://apartamentelavanzare.ro/de-la-proprietar/timisoara/ultracentrala-case-de-vanzare-240000-euro-41670", "Proprietar Timisoara, Case de vanzare la vanzare in ...")).toBe(false);
    expect(isSearchPageUrl("https://www.airbnb.com.ro/rooms/1455624510877728733", "Joy City Stay - Apartamente de închiriat în Timișoara")).toBe(false);
  });
  it("titluri de anunț la singular", () => {
    expect(isSearchPageUrl("https://exemplu.ro/listare", "Apartament 2 camere de vânzare, Iosefin")).toBe(false);
    expect(isSearchPageUrl("https://exemplu.ro/listare", "Casă de vânzare în Giroc, proprietar")).toBe(false);
  });
});

describe("listingUrl — oglinda pentru funcțiile de server", () => {
  it("cele două fișiere sunt identice", () => {
    const web = readFileSync("src/lib/listingUrl.ts", "utf8");
    const edge = readFileSync("supabase/functions/_shared/listingUrl.ts", "utf8");
    expect(edge).toBe(web);
  });
});

describe("isRoMobile", () => {
  it("mobile phones", () => {
    expect(isRoMobile("+40726596964")).toBe(true);
    expect(isRoMobile("+40202609200")).toBe(false);
  });
});
