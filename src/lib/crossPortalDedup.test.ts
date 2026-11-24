import { describe, expect, it } from "vitest";
import {
  compareListings, groupCrossPortalDuplicates, matchesPhoneFilter, normalizedArea,
  outreachBlockReason, phoneAvailability, portalKey, signalsOf, type DedupListing,
} from "./crossPortalDedup";

const base = (over: Partial<DedupListing>): DedupListing => ({
  id: "x", source_platform: "OLX", source_url: "https://www.olx.ro/d/oferta/ap-IDabc.html",
  title: "Vand apartament 2 camere", description: "", zone: null, rooms: 2, size: 54, price: 98000,
  currency: "EUR", category: "vanzare", contact_phone: null, phone_normalized: null, is_active: true,
  last_seen_at: "2026-11-20T10:00:00Z", ...over,
});

const olxMara = base({ id: "olx", title: "Vand apartament 2 camere City of Mara, proprietar", size: 54, price: 98000, contact_phone: "0722 123 456" });
const imoMara = base({ id: "imo", source_platform: "imobiliare.ro", source_url: "https://www.imobiliare.ro/oferta/apartament-2-camere-city-of-mara-123456", title: "Apartament 2 camere, City of Mara, mobilat", size: 55.5, price: 99500, last_seen_at: "2026-11-21T10:00:00Z" });

describe("compareListings — același apartament pe portaluri diferite", () => {
  it("OLX + Imobiliare.ro: aceeași zonă, camere, suprafață și preț apropiate", () => {
    const r = compareListings(olxMara, imoMara);
    expect(r.match).toBe(true);
    expect(r.reasons).toContain("aceeași zonă (City of Mara)");
  });

  it("același telefon pe Storia și Publi24, chiar fără zonă", () => {
    const a = base({ id: "a", source_platform: "Storia.ro", source_url: "https://www.storia.ro/ro/oferta/x-IDq1", title: "Apartament 3 camere decomandat", rooms: 3, size: 78, price: 145000, phone_normalized: "+40733111222" });
    const b = base({ id: "b", source_platform: "Publi24", source_url: "https://www.publi24.ro/anunturi/imobiliare/anunt/y", title: "3 camere de vanzare", rooms: 3, size: 80, price: 149000, contact_phone: "0733111222" });
    expect(compareListings(a, b).match).toBe(true);
  });

  it("recunoaște Monarch ca Monarh și zona salvată 'Centru' ca Cetate", () => {
    expect(normalizedArea(base({ title: "2 camere Monarch Residence" }))).toBe("Monarh");
    expect(normalizedArea(base({ title: "Apartament", zone: "Centru" }))).toBe("Cetate");
    expect(normalizedArea(base({ title: "Apartament NordOne", zone: "Aradului" }))).toBe("NordOne");
  });

  it("ignoră suprafețele salvate greșit la apartamente", () => {
    expect(signalsOf(base({ title: "Apartament 4 camere Cetatii", size: 1767 })).size).toBeNull();
    expect(signalsOf(base({ title: "Apartament 4 camere, 98 mp", size: 1767 })).size).toBe(98);
  });

  it("platforma generică se recunoaște după adresă", () => {
    expect(portalKey(base({ source_platform: "General", source_url: "https://www.olx.ro/d/oferta/z-IDx.html" }))).toBe("olx");
    expect(portalKey(base({ source_platform: "Custom", source_url: "https://www.imobiliare.ro/oferta/a-123456" }))).toBe("imobiliare");
  });
});

describe("compareListings — imobile asemănătoare dar distincte", () => {
  it("același complex, aceleași camere, dar suprafață diferită", () => {
    expect(compareListings(olxMara, { ...imoMara, size: 68 }).match).toBe(false);
  });
  it("număr diferit de camere", () => {
    expect(compareListings(olxMara, { ...imoMara, rooms: 3 }).match).toBe(false);
  });
  it("complexe diferite (NordOne vs XCity)", () => {
    const a = base({ id: "a", title: "2 camere NordOne" });
    const b = base({ id: "b", source_platform: "Storia.ro", source_url: "https://www.storia.ro/ro/oferta/q-IDz", title: "2 camere XCity" });
    expect(compareListings(a, b).match).toBe(false);
  });
  it("complexe diferite pe aceeași stradă (Campeador vs Vox, Torontalului)", () => {
    const a = base({ id: "a", source_platform: "Storia.ro", source_url: "https://www.storia.ro/ro/oferta/c-IDc", title: "2 camere Campeador Residence", zone: "Torontalului", category: "inchiriere", size: 50, price: 500 });
    const b = base({ id: "b", title: "Inchiriez 2 camere Torontalului Vox", zone: "Torontalului", category: "inchiriere", size: 51, price: 490 });
    expect(compareListings(a, b).match).toBe(false);
  });
  it("în Centru/Cetate (zonă mare), cifrele apropiate nu ajung fără telefon sau titlu asemănător", () => {
    const a = base({ id: "a", title: "3 camere zona Mircea cel Batran", zone: "Centru", rooms: 3, size: 70, price: 114900 });
    const b = base({ id: "b", source_platform: "Anuntul.ro", source_url: "https://www.anuntul.ro/anunt-vanzare-ap-3-camere-brancusi", title: "Apartament 3 camere Brancusi", zone: "Centru", rooms: 3, size: 69, price: 115000 });
    expect(compareListings(a, b).match).toBe(false);
    expect(compareListings({ ...a, title: "Apartament 3 camere Brancusi etaj 2" }, b).match).toBe(true);
  });
  it("preț prea diferit (peste 6%)", () => {
    expect(compareListings(olxMara, { ...imoMara, price: 115000 }).match).toBe(false);
  });
  it("vânzare vs închiriere", () => {
    expect(compareListings(olxMara, { ...imoMara, category: "inchiriere", title: "Inchiriez 2 camere City of Mara", price: 98000 }).match).toBe(false);
  });
  it("telefoane diferite înseamnă proprietari diferiți", () => {
    expect(compareListings(olxMara, { ...imoMara, contact_phone: "0744 999 888" }).match).toBe(false);
  });
  it("doar zona și camerele nu ajung fără suprafață sau preț", () => {
    expect(compareListings({ ...olxMara, size: null, price: null, contact_phone: null }, { ...imoMara, size: null, price: null }).match).toBe(false);
  });
  it("două anunțuri diferite pe același portal nu se unesc", () => {
    expect(compareListings(olxMara, { ...imoMara, source_platform: "OLX", source_url: "https://www.olx.ro/d/oferta/alt-IDdef.html" }).match).toBe(false);
  });
  it("un preț neverosimil nu este folosit la comparare", () => {
    // 3.500 € la vânzare este curățat de regulile de preț → nu poate dovedi potrivirea
    expect(compareListings({ ...olxMara, size: null, price: 3500, contact_phone: null }, { ...imoMara, size: null, price: 3500 }).match).toBe(false);
  });
});

describe("groupCrossPortalDuplicates", () => {
  it("alege principalul cu telefon și leagă varianta de pe celălalt portal", () => {
    const groups = groupCrossPortalDuplicates([imoMara, olxMara]);
    expect(groups).toHaveLength(1);
    expect(groups[0].primary.id).toBe("olx");
    expect(groups[0].variants.map((v) => v.id)).toEqual(["imo"]);
    expect(groups[0].portals.sort()).toEqual(["imobiliare", "olx"]);
  });

  it("fără telefon, preferă datele mai complete, apoi actualizarea mai recentă", () => {
    const a = { ...olxMara, contact_phone: null, last_seen_at: "2026-11-01T00:00:00Z" };
    const b = { ...imoMara, last_seen_at: "2026-11-21T00:00:00Z" };
    expect(groupCrossPortalDuplicates([a, b])[0].primary.id).toBe("imo");
    const poor = { ...imoMara, images: [], description: "" };
    const rich = { ...a, images: ["1.jpg"], description: "x".repeat(250) };
    expect(groupCrossPortalDuplicates([poor, rich])[0].primary.id).toBe("olx");
  });

  it("nu formează lanțuri: fiecare variantă se potrivește cu principalul", () => {
    const storia = base({ id: "st", source_platform: "Storia.ro", source_url: "https://www.storia.ro/ro/oferta/m-IDm", title: "2 camere City of Mara", size: 58, price: 104000 });
    // imo ≈ olx și imo ≈ storia, dar olx (54 mp, 98.000) ≠ storia (58 mp, 104.000)
    const groups = groupCrossPortalDuplicates([olxMara, imoMara, storia]);
    const withOlx = groups.find((g) => [g.primary, ...g.variants].some((m) => m.id === "olx"))!;
    expect([withOlx.primary, ...withOlx.variants].some((m) => m.id === "st")).toBe(false);
  });

  it("păstrează duplicatele marcate deja la colectare lângă original", () => {
    const orig = base({ id: "orig", title: "Casa Ghiroda", rooms: 4, size: 120, price: 200000 });
    const dup = base({ id: "dup", source_platform: "Publi24", source_url: "https://www.publi24.ro/anunturi/a/anunt/b", title: "Altceva", rooms: 4, duplicate_of: "orig" });
    const groups = groupCrossPortalDuplicates([dup, orig]);
    expect(groups).toHaveLength(1);
    expect(groups[0].variants.map((v) => v.id)).toEqual(["dup"]);
  });

  it("imobilele distincte rămân grupuri separate", () => {
    const other = base({ id: "other", source_platform: "imobiliare.ro", source_url: "https://www.imobiliare.ro/oferta/x-999999", title: "2 camere Iosefin", size: 54, price: 98000 });
    expect(groupCrossPortalDuplicates([olxMara, other])).toHaveLength(2);
  });
});

describe("filtrul de disponibilitate a telefonului", () => {
  const withPhone = base({ contact_phone: "0722 123 456" });
  const noPhone = base({ contact_phone: null, phone_normalized: null });
  const junk = base({ contact_phone: "Arată numărul" });

  it("separă anunțurile cu număr de cele care cer dezvăluire manuală", () => {
    expect(phoneAvailability(withPhone)).toBe("available");
    expect(phoneAvailability(noPhone)).toBe("manual");
    expect(phoneAvailability(junk)).toBe("manual");
  });

  it("Toate / Număr disponibil / Necesită dezvăluire manuală", () => {
    const list = [withPhone, noPhone, junk];
    expect(list.filter((l) => matchesPhoneFilter(l, "all"))).toHaveLength(3);
    expect(list.filter((l) => matchesPhoneFilter(l, "available"))).toEqual([withPhone]);
    expect(list.filter((l) => matchesPhoneFilter(l, "manual"))).toEqual([noPhone, junk]);
  });

  it("blochează trimiterea spre coada de contactare fără telefon, cu număr fix sau anunț inactiv", () => {
    expect(outreachBlockReason(noPhone)).toBe("Necesită dezvăluire manuală a numărului");
    expect(outreachBlockReason(base({ contact_phone: "0256 123 456" }))).toBe("Număr fix — nu se trimite pe WhatsApp");
    expect(outreachBlockReason({ ...withPhone, is_active: false })).toBe("Anunț inactiv");
    expect(outreachBlockReason({ ...withPhone, do_not_call: true })).toBe("Nu dorește să fie contactat");
    expect(outreachBlockReason(withPhone)).toBeNull();
  });
});

import { isGenericSearchListing } from "./crossPortalDedup";

describe("pagini de căutare generice în deduplicare", () => {
  const search = base({ id: "lp", source_platform: "laproprietar.ro", source_url: "https://laproprietar.ro/imobiliare/timisoara",
    title: "Apartamente de vânzare și de închiriat în Timișoara — de la proprietar", contact_phone: "0722 123 456" });
  it("sunt recunoscute ca pagini de căutare, nu ca anunțuri", () => {
    expect(isGenericSearchListing(search)).toBe(true);
    expect(isGenericSearchListing(olxMara)).toBe(false);
    expect(signalsOf(search).listingPage).toBe(false);
  });
  it("nu se grupează cu un anunț real, nici pe același telefon", () => {
    expect(compareListings(olxMara, search).match).toBe(false);
  });
});
