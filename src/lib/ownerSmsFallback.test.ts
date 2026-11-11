import { describe, expect, it } from "vitest";
import { ownerSmsHref, ownerSmsShortLink, ownerSmsText, shortAnalysisTarget } from "./ownerSmsFallback";

describe("SMS pentru proprietarii fără WhatsApp", () => {
  it("textul are zona, linkul scurt și numărul de contact", () => {
    expect(ownerSmsText("Iosefin", "inchiriere")).toBe(
      "Buna ziua! Am vazut anuntul dvoastra din Iosefin. Vedeti gratuit analiza de prezentare RealTrust aici: realtrust.ro/aa/i/Iosefin . Detalii la 0723154520.",
    );
  });
  it("vânzare → /aa/v, fără diacritice, zonă de rezervă Timișoara", () => {
    expect(ownerSmsShortLink("Dumbrăvița", "vanzare")).toBe("realtrust.ro/aa/v/Dumbravita");
    expect(ownerSmsText(null, "vanzare")).toContain("din Timisoara.");
  });
  it("încape într-un singur SMS pentru zonele uzuale", () => {
    for (const z of ["Iosefin", "Fabric", "Cetate", "Aradului", "Dumbrăvița"]) {
      expect(ownerSmsText(z, "inchiriere").length).toBeLessThanOrEqual(160);
    }
  });
  it("linkul scurt duce la analiza cu eticheta de închiriere", () => {
    expect(shortAnalysisTarget("i", "Iosefin")).toBe("/analiza-anunt?zona=Iosefin&tip=inchiriere&listing_type=inchiriere");
    expect(shortAnalysisTarget("v", "Fabric")).toBe("/analiza-anunt?zona=Fabric&tip=vanzare&listing_type=vanzare");
  });
  it("linkul sms: păstrează textul codificat", () => {
    expect(ownerSmsHref("+40712345678", "a b")).toBe("sms:+40712345678?&body=a%20b");
  });
});
