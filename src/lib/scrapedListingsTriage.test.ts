import { describe, expect, it } from "vitest";
import { groupCrossPortalDuplicates, type DedupListing } from "./crossPortalDedup";
import { buildTriageRows, DEFAULT_TRIAGE_FILTERS, isReadyForOutreach, summarizeTriage, triageBlockReason } from "./scrapedListingsTriage";

const l = (over: Partial<DedupListing>): DedupListing => ({
  id: "x", source_platform: "OLX", source_url: "https://www.olx.ro/d/oferta/a-IDa.html", title: "2 camere City of Mara",
  rooms: 2, size: 54, price: 98000, currency: "EUR", category: "vanzare", is_active: true, ...over,
});

const ownerFields = { seller_type: "privat", lifecycle_status: "new", tags: [], andrei_queued_at: null, outreach_status: null };
const olx = l({ id: "olx", contact_phone: "0722123456", ...ownerFields });
const imo = l({ id: "imo", source_platform: "imobiliare.ro", source_url: "https://www.imobiliare.ro/oferta/b-123456", size: 55, price: 99000 });
const solo = l({ id: "solo", source_platform: "Storia.ro", source_url: "https://www.storia.ro/ro/oferta/c-IDc", title: "3 camere Iosefin", rooms: 3, size: 80, price: 150000 });
const groups = groupCrossPortalDuplicates([olx, imo, solo]);

describe("Ascunde duplicatele", () => {
  it("activat implicit: un singur rând per imobil, cu numărul de variante", () => {
    expect(DEFAULT_TRIAGE_FILTERS.hideDuplicates).toBe(true);
    const rows = buildTriageRows(groups, DEFAULT_TRIAGE_FILTERS);
    expect(rows.map((r) => r.listing.id).sort()).toEqual(["olx", "solo"]);
    expect(rows.find((r) => r.listing.id === "olx")!.duplicateCount).toBe(1);
  });
  it("dezactivat: arată și variantele, marcate ca neprincipale", () => {
    const rows = buildTriageRows(groups, { ...DEFAULT_TRIAGE_FILTERS, hideDuplicates: false });
    expect(rows).toHaveLength(3);
    expect(rows.find((r) => r.listing.id === "imo")!.isPrimary).toBe(false);
  });
});

describe("filtrul de telefon în triere", () => {
  it("Număr telefon disponibil / Necesită dezvăluire manuală", () => {
    expect(buildTriageRows(groups, { ...DEFAULT_TRIAGE_FILTERS, phone: "available" }).map((r) => r.listing.id)).toEqual(["olx"]);
    expect(buildTriageRows(groups, { ...DEFAULT_TRIAGE_FILTERS, phone: "manual" }).map((r) => r.listing.id)).toEqual(["solo"]);
  });
  it("se combină cu portalul și starea", () => {
    expect(buildTriageRows(groups, { ...DEFAULT_TRIAGE_FILTERS, hideDuplicates: false, portal: "imobiliare" }).map((r) => r.listing.id)).toEqual(["imo"]);
    expect(buildTriageRows(groups, { ...DEFAULT_TRIAGE_FILTERS, status: "inactive" })).toHaveLength(0);
  });
});

describe("summarizeTriage", () => {
  it("numără imobilele unice, variantele, telefoanele și anunțurile pregătite", () => {
    expect(summarizeTriage(groups)).toEqual({ listings: 3, properties: 2, duplicateGroups: 1, variants: 1, withPhone: 1, manualReveal: 1, ready: 1 });
  });
});

describe("ordinea de lucru", () => {
  it("anunțurile pregătite pentru prospectare apar primele, cele inactive ultimele", () => {
    const old = l({ id: "old", source_platform: "Publi24", source_url: "https://www.publi24.ro/anunturi/a/anunt/z", title: "2 camere Fabric", is_active: false, contact_phone: "0733000111", last_seen_at: "2026-11-21T00:00:00Z" });
    const rows = buildTriageRows(groupCrossPortalDuplicates([old, solo, olx, imo]), DEFAULT_TRIAGE_FILTERS);
    expect(rows.map((r) => r.listing.id)).toEqual(["olx", "solo", "old"]);
  });
});

describe("pregătit pentru prospectare", () => {
  it("cere mobil, anunț activ, proprietar privat confirmat și niciun contact anterior", () => {
    expect(isReadyForOutreach(olx)).toBe(true);
    expect(triageBlockReason(solo)).toBe("Necesită dezvăluire manuală a numărului");
    expect(triageBlockReason({ ...olx, seller_type: "de_verificat" })).toBe("Neconfirmat");
    expect(triageBlockReason({ ...olx, outreach_status: "whatsapp_sent" })).toBe("Trimis pe WhatsApp");
    expect(triageBlockReason({ ...olx, is_active: false })).toBe("Anunț inactiv");
  });
});
