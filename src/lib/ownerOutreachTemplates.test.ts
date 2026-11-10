import { describe, expect, it } from "vitest";
import { OWNER_OUTREACH_TEMPLATES, defaultFirstTemplateKey, detectListingTransaction, getTemplate, saleMessageViolations, SALE_PUBLISH_TEXT } from "./ownerOutreachTemplates";

describe("outreach template by listing type", () => {
  it(" predefined sale text offers free publishing and asks DA or NU", () => {
    expect(SALE_PUBLISH_TEXT).toContain("publicarea gratuită");
    expect(SALE_PUBLISH_TEXT).toContain("DA sau NU");
    expect(saleMessageViolations(SALE_PUBLISH_TEXT)).toEqual([]);
  });
  it("maps sale and rent listings", () => {
    const sale = detectListingTransaction({ source_url: "https://www.olx.ro/d/oferta/apartament-2-camere-vanzare-IDx.html" });
    const rent = detectListingTransaction({ title: "Apartament de închiriat, chirie 450 €", source_url: "https://www.storia.ro/ro/oferta/inchiriere-ap" });
    expect(defaultFirstTemplateKey(sale)).toBe("first_sale");
    expect(defaultFirstTemplateKey(rent)).toBe("first_management");
    expect(defaultFirstTemplateKey("necunoscut")).toBe("first_management");
  });
  it("sale message never proposes rent or 12-month management", () => {
    const msg = getTemplate("first_sale").build({ zone: "Iosefin", rooms: 2, durationMonths: 12 });
    expect(saleMessageViolations(msg)).toEqual([]);
    expect(saleMessageViolations(getTemplate("first_management").build({}))).not.toEqual([]);
  });
  it("keeps sale reminders free of rental offers", () => {
    for (const key of ["reminder_sale_24h", "reminder_sale_72h"]) {
      expect(saleMessageViolations(getTemplate(key).build({ zone: "Iosefin", offerPrice: 550, durationMonths: 12 }))).toEqual([]);
    }
  });
  it("recognizes rental titles and negated rental intent", () => {
    expect(detectListingTransaction({ title: "Apartament de închiriat" })).toBe("inchiriere");
    expect(detectListingTransaction({ title: "Vând apartament, nu închiriez" })).toBe("vanzare");
    expect(detectListingTransaction({ title: "Se închiriază apartament" })).toBe("inchiriere");
  });
  it("uses current listing category before old URL wording", () => {
    expect(detectListingTransaction({ category: "Vânzare", source_url: "https://example.com/inchiriere-apartament" })).toBe("vanzare");
  });
  it("uses only the approved management commission", () => {
    const message = getTemplate("first_management").build({});
    expect(message).not.toContain("25%");
    expect(message).not.toContain("garantat");
  });
  it("sale first message uses the approved wording with listing rooms, zone and source", () => {
    const msg = getTemplate("first_sale").build({ zone: "Iosefin", rooms: 2, platform: "OLX-Vanzari" });
    expect(msg).toBe("Bună ziua! Sunt Andrei, de la RealTrust Timișoara. Am văzut anunțul dumneavoastră pentru apartamentul de 2 camere din zona Iosefin publicat pe OLX. Avem clienți cumpărători în căutare pe această zonă și vă putem ajuta cu promovarea și selecția ofertelor. Când ați avea 5 minute disponibile pentru o scurtă discuție?");
    expect(msg).not.toMatch(/100%|garant/i);
  });
  it("sale first message omits generic sources", () => {
    expect(getTemplate("first_sale").build({ zone: "Fabric", rooms: 3, platform: "General" })).toContain("apartamentul de 3 camere din zona Fabric. Avem");
  });
  it("short first message uses the full sender name and listing data", () => {
    expect(getTemplate("first_short").build({ zone: "Cetate", rooms: 1 })).toBe("Bună ziua! Sunt Andrei, RealTrust & ApArt Hotel Timișoara. Referitor la apartamentul dumneavoastră de o cameră din zona Cetate: vă putem oferi o estimare gratuită de venit net lunar (regim hotelier / chirie). Vă pot trimite calculul exact pe WhatsApp?");
  });
  it("rental offer asks for non-exclusive collaboration with the approved wording", () => {
    const msg = getTemplate("first_rent_offer").build({ zone: "Lipovei", rooms: 2, platform: "storia" });
    expect(msg).toBe(
      "Bună ziua! Sunt Andrei, de la RealTrust Timișoara.\n\nAm văzut anunțul dumneavoastră pentru apartamentul de 2 camere din zona Lipovei publicat pe Storia.\n\nAvem clienți chiriași verificați în căutare pe această zonă. Doriți să promovăm și noi proprietatea în regim de colaborare deschisă (neexclusivă), cu 0% comision din partea dumneavoastră?\n\nDacă sunteți de acord, ne puteți confirma printr-un simplu răspuns sau ne puteți spune când putem stabili o vizionare."
    );
    expect(msg).not.toMatch(/garant/i);
  });
  it("rental offer omits generic sources", () => {
    expect(getTemplate("first_rent_offer").build({ zone: "Fabric", rooms: 3, platform: "General" })).toContain("pentru apartamentul de 3 camere din zona Fabric.");
  });
  it("every template except the two approved wordings uses the new sender", () => {
    for (const t of OWNER_OUTREACH_TEMPLATES) {
      if (t.key === "first_sale" || t.key === "first_rent_offer") continue;
      const msg = t.build({ zone: "Iosefin", rooms: 2 });
      expect(msg).not.toContain("de la RealTrust Timișoara");
      expect(msg).toMatch(/Andrei de la RealTrust|Andrei[,–\s]+RealTrust & ApArt Hotel Timișoara/);
    }
  });
  it("reminders name the sender", () => {
    for (const key of ["reminder_24h", "reminder_sale_24h", "reminder_sale_72h", "reminder_72h"]) {
      expect(getTemplate(key).build({ zone: "Iosefin", rooms: 2 })).toMatch(/Andrei,? de la RealTrust/);
    }
  });
});

import { rentalFirstMessage as rfm } from "./ownerOutreachTemplates";
import { rentalFirstMessage as edgeRfm } from "../../supabase/functions/_shared/rentalIntroMessage";
describe("rentalFirstMessage", () => {
  it("folosește formularea aprobată cu camerele și zona din anunț", () => {
    expect(rfm(2, "Iosefin")).toBe("Bună ziua! Sunt Andrei – RealTrust & ApArt Hotel Timișoara. Vă contactez în legătură cu apartamentul de 2 camere din zona Iosefin. Oferim servicii complete de administrare în regim hotelier (promovare Booking/Airbnb, curățenie, mentenanță), cu un venit net estimat cu 30-40% mai mare decât chiria clasică. Vă pot trimite gratuit o simulare de randament net pentru zona dumneavoastră?");
  });
  it("folosește textul de rezervă când lipsește zona sau camerele", () => {
    expect(rfm(2, "")).toContain("apartamentul de 2 camere din Timișoara.");
    expect(rfm(null, "Cetate")).toContain("apartamentul dumneavoastră din zona Cetate.");
    expect(rfm(null, null)).toContain("apartamentul dumneavoastră din Timișoara.");
  });
  it("mesajul trimis automat prin Make este identic cu cel din panou", () => {
    for (const [r, z] of [[2, "Iosefin"], [1, ""], [null, "Fabric"]] as const) expect(edgeRfm(r, z)).toBe(rfm(r, z));
  });
});
