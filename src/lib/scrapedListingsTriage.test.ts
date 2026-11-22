import { describe, expect, it } from "vitest";
import { groupCrossPortalDuplicates, type DedupListing } from "./crossPortalDedup";
import { buildTriageRows, DEFAULT_TRIAGE_FILTERS, isReadyForOutreach, summarizeTriage, triageBlockReason } from "./scrapedListingsTriage";

const l = (over: Partial<DedupListing>): DedupListing => ({
  id: "x", source_platform: "OLX", source_url: "https://www.olx.ro/d/oferta/a-IDa.html", title: "2 camere City of Mara",
  rooms: 2, size: 54, price: 98000, currency: "EUR", category: "vanzare", is_active: true, ...over,
});

const ownerFields = { seller_type: "privat", lifecycle_status: "new", tags: [], andrei_queued_at: null, outreach_status: null, lead_score: 75 };
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
  it("agențiile sunt blocate, iar scorul trebuie să fie peste 60", () => {
    expect(triageBlockReason({ ...olx, contact_name: "Imobiliare Vest SRL" })).toBe("Agenție blocată");
    expect(triageBlockReason({ ...olx, outreach_status: "blocked_agency" })).toBe("Agenție blocată");
    expect(triageBlockReason({ ...olx, lead_score: 60 })).toBe("Scor ≤ 60");
    expect(isReadyForOutreach({ ...olx, lead_score: 61 })).toBe(true);
  });
});

import { triagePool } from "./scrapedListingsTriage";

describe("Indisponibile / renunțate", () => {
  const gone = l({ id: "gone", source_platform: "Publi24", source_url: "https://www.publi24.ro/anunturi/x.html", title: "4 camere Girocului", rooms: 4, size: 95, price: 160000, dismissed_at: "2026-11-22T16:20:00Z" } as Partial<DedupListing>);
  const all = [olx, imo, solo, gone];

  it("sunt ascunse implicit din lista principală", () => {
    expect(DEFAULT_TRIAGE_FILTERS.hideDismissed).toBe(true);
    const g = groupCrossPortalDuplicates(triagePool(all, DEFAULT_TRIAGE_FILTERS));
    expect(buildTriageRows(g, DEFAULT_TRIAGE_FILTERS).map((r) => r.listing.id)).not.toContain("gone");
  });
  it("apar din nou când comutatorul e oprit", () => {
    const f = { ...DEFAULT_TRIAGE_FILTERS, hideDismissed: false };
    const g = groupCrossPortalDuplicates(triagePool(all, f));
    expect(buildTriageRows(g, f).map((r) => r.listing.id)).toContain("gone");
  });
  it("starea „Indisponibile” arată doar anunțurile renunțate", () => {
    const f = { ...DEFAULT_TRIAGE_FILTERS, status: "dismissed" as const };
    const g = groupCrossPortalDuplicates(triagePool(all, f));
    expect(buildTriageRows(g, f).map((r) => r.listing.id)).toEqual(["gone"]);
  });
  it("un principal renunțat nu își ascunde varianta de pe alt portal", () => {
    const dismissedOlx = { ...olx, dismissed_at: "2026-11-22T16:20:00Z" };
    const g = groupCrossPortalDuplicates(triagePool([dismissedOlx, imo, solo], DEFAULT_TRIAGE_FILTERS));
    expect(buildTriageRows(g, DEFAULT_TRIAGE_FILTERS).map((r) => r.listing.id).sort()).toEqual(["imo", "solo"]);
  });
  it("„Toate stările”, „Ascunde duplicatele” și „Pregătit pentru prospectare” rămân neschimbate", () => {
    const g = groupCrossPortalDuplicates(triagePool(all, DEFAULT_TRIAGE_FILTERS));
    const rows = buildTriageRows(g, DEFAULT_TRIAGE_FILTERS);
    expect(rows.map((r) => r.listing.id).sort()).toEqual(["olx", "solo"]);
    expect(isReadyForOutreach(olx)).toBe(true);
    expect(summarizeTriage(g).ready).toBe(1);
  });
});

import { activeQuickFilter, applyQuickFilter } from "./scrapedListingsTriage";

describe("cardurile de cifre ca filtre rapide", () => {
  const apply = (f: typeof DEFAULT_TRIAGE_FILTERS, q: Parameters<typeof applyQuickFilter>[1]) => ({ ...f, ...applyQuickFilter(f, q) });
  const ids = (f: typeof DEFAULT_TRIAGE_FILTERS) => buildTriageRows(groups, f).map((r) => r.listing.id).sort();

  it("„Cu telefon” și „Necesită dezvăluire” sunt aceleași filtre ca butoanele Telefon", () => {
    const withPhone = apply(DEFAULT_TRIAGE_FILTERS, "withPhone");
    expect(withPhone.phone).toBe("available");
    expect(ids(withPhone)).toEqual(["olx"]);
    const manual = apply(DEFAULT_TRIAGE_FILTERS, "manualReveal");
    expect(manual.phone).toBe("manual");
    expect(ids(manual)).toEqual(["solo"]);
  });
  it("„Pregătite pentru prospectare” arată doar anunțurile eligibile", () => {
    const ready = apply(DEFAULT_TRIAGE_FILTERS, "ready");
    expect(ready.readyOnly).toBe(true);
    expect(ids(ready)).toEqual(["olx"]);
    expect(ids(apply(DEFAULT_TRIAGE_FILTERS, "ready")).every((id) => isReadyForOutreach([olx, imo, solo].find((x) => x.id === id)!))).toBe(true);
  });
  it("„Imobile unice” resetează filtrul rapid și respectă „Ascunde duplicatele”", () => {
    const reset = apply(apply(DEFAULT_TRIAGE_FILTERS, "ready"), "properties");
    expect(activeQuickFilter(reset)).toBe("properties");
    expect(ids(reset)).toEqual(["olx", "solo"]);
    expect(ids({ ...reset, hideDuplicates: false })).toEqual(["imo", "olx", "solo"]);
  });
  it("a doua apăsare pe cardul activ revine la toate imobilele", () => {
    const once = apply(DEFAULT_TRIAGE_FILTERS, "withPhone");
    expect(activeQuickFilter(once)).toBe("withPhone");
    expect(activeQuickFilter(apply(once, "withPhone"))).toBe("properties");
  });
  it("cardul activ urmează filtrele Telefon de dedesubt", () => {
    expect(activeQuickFilter({ ...DEFAULT_TRIAGE_FILTERS, phone: "manual" })).toBe("manualReveal");
    expect(activeQuickFilter({ ...DEFAULT_TRIAGE_FILTERS, phone: "available" })).toBe("withPhone");
    expect(activeQuickFilter(DEFAULT_TRIAGE_FILTERS)).toBe("properties");
  });
});

import { privateConfirmMode, triageReasonHint, type TriageListing } from "./scrapedListingsTriage";

const t = (over: Partial<TriageListing>): TriageListing => l(over as Partial<DedupListing>) as TriageListing;

describe("Confirmă privat în triere", () => {
  const base = { ...ownerFields, contact_phone: "0722123456" };
  it("apare pe proprietarii neconfirmați cu telefon", () => {
    expect(privateConfirmMode(t({ ...base, seller_type: "de_verificat" }))).toBe("confirm");
  });
  it("nu apare pe anunțurile deja private, indisponibile, contactate sau fără telefon", () => {
    expect(privateConfirmMode(t({ ...base }))).toBeNull();
    expect(privateConfirmMode(t({ ...base, seller_type: "de_verificat", dismissed_at: "2026-11-22T10:00:00Z" }))).toBeNull();
    expect(privateConfirmMode(t({ ...base, seller_type: "de_verificat", outreach_status: "sent" }))).toBeNull();
    expect(privateConfirmMode(t({ ...base, seller_type: "de_verificat", contact_phone: null }))).toBeNull();
  });
  it("agenție marcată doar de clasificare: cere confirmarea separată", () => {
    expect(privateConfirmMode(t({ ...base, seller_type: "agentie" }))).toBe("override");
    expect(privateConfirmMode(t({ ...base, seller_type: "de_verificat", outreach_status: "blocked_agency" }))).toBe("override");
  });
  it("cuvinte de agenție în titlu sau nume: nu se poate confirma deloc", () => {
    expect(privateConfirmMode(t({ ...base, seller_type: "agentie", title: "Agenția X vinde 2 camere" }))).toBeNull();
    expect(privateConfirmMode(t({ ...base, seller_type: "de_verificat", contact_name: "Best Imobiliare SRL" }))).toBeNull();
  });
  it("după confirmare: scor 60 rămâne blocat cu motivul exact, scor 61 devine pregătit", () => {
    const low = t({ ...base, lead_score: 60 });
    expect(triageBlockReason(low)).toBe("Scor ≤ 60");
    expect(triageReasonHint(low, "Scor ≤ 60")).toContain("scorul este 60");
    expect(isReadyForOutreach(t({ ...base, lead_score: 61 }))).toBe(true);
  });
  it("după confirmare fără telefon valid sau cu opt-out: rămâne blocat", () => {
    expect(triageBlockReason(t({ ...base, contact_phone: "0256123456" }))).not.toBeNull();
    expect(triageBlockReason(t({ ...base, do_not_call: true }))).toBe("Nu dorește să fie contactat");
  });
});
