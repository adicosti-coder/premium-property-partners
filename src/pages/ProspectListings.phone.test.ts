import { describe, expect, it } from "vitest";
import { extractPhoneFromText, getProspectPhone, getProspectPhoneInfo, normalizeRoPhone } from "./ProspectListings";

const emptyProspect = {
  phone_normalized: null,
  contact_phone: null,
  admin_notes: null,
  description: null,
  title: null,
};

describe("Telefon Contact fallback", () => {
  it("normalizează numere mobile românești din formate uzuale", () => {
    expect(normalizeRoPhone("0736 344 127")).toBe("+40736344127");
    expect(normalizeRoPhone("+40 736.344.127")).toBe("+40736344127");
    expect(normalizeRoPhone("0040 736 344 127")).toBe("+40736344127");
  });

  it("normalizează și numere fixe când acestea există în câmpul de contact", () => {
    expect(normalizeRoPhone("0356 456 333")).toBe("+40356456333");
    expect(normalizeRoPhone("+40 356 456 333")).toBe("+40356456333");
  });

  it("extrage telefonul din descriere când contact_phone și phone_normalized lipsesc", () => {
    const prospect = {
      ...emptyProspect,
      description: "Proprietar, apartament 2 camere. Pentru detalii sunați la 0736 344 127 după ora 18.",
    };

    expect(getProspectPhone(prospect)).toBe("+40736344127");
    expect(getProspectPhoneInfo(prospect)).toMatchObject({
      phone: "+40736344127",
      source: "description",
      persisted: false,
    });
  });

  it("extrage telefonul din titlu ca ultim fallback pentru coloana Telefon Contact", () => {
    const prospect = {
      ...emptyProspect,
      title: "Apartament proprietar direct, tel 0722.814.546",
    };

    expect(getProspectPhone(prospect)).toBe("+40722814546");
  });

  it("preferă phone_normalized înaintea telefonului extras din text", () => {
    const prospect = {
      ...emptyProspect,
      phone_normalized: "+40711111111",
      description: "Telefon alternativ 0736 344 127",
    };

    expect(getProspectPhoneInfo(prospect)).toMatchObject({
      phone: "+40711111111",
      source: "phone_normalized",
      persisted: true,
    });
  });

  it("ignoră sume/prețuri și nu le afișează ca telefon", () => {
    expect(extractPhoneFromText("Preț 210.000 EUR, etaj 2, construit 2026")).toBeNull();
  });
});
