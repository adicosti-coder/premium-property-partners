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
  const gone = l({ id: "gone", source_platform: "Publi24", source_url: "https://www.publi24.ro/anunturi/imobiliare/de-vanzare/apartamente/anunt/4-camere-girocului/x1.html", title: "4 camere Girocului", rooms: 4, size: 95, price: 160000, dismissed_at: "2026-11-22T16:20:00Z" } as Partial<DedupListing>);
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

import { agencyMarkMode, isAgencyListing } from "./scrapedListingsTriage";

describe("butonul „Agenție” în triere", () => {
  const base = { ...ownerFields, contact_phone: "0722123456" };
  it("apare pe anunțurile care nu sunt deja agenție blocată (privat, neconfirmat, fără telefon)", () => {
    expect(agencyMarkMode(t({ ...base }))).toBe("mark");
    expect(agencyMarkMode(t({ ...base, seller_type: "de_verificat" }))).toBe("mark");
    expect(agencyMarkMode(t({ ...base, contact_phone: null }))).toBe("mark");
  });
  it("nu apare pe agențiile deja blocate sau pe anunțurile indisponibile", () => {
    expect(agencyMarkMode(t({ ...base, seller_type: "agentie" }))).toBeNull();
    expect(agencyMarkMode(t({ ...base, outreach_status: "blocked_agency" }))).toBeNull();
    expect(agencyMarkMode(t({ ...base, title: "Agenția X vinde 2 camere" }))).toBeNull();
    expect(agencyMarkMode(t({ ...base, dismissed_at: "2026-11-22T10:00:00Z" }))).toBeNull();
  });
  it("după marcare: eticheta „Agenție blocată”, Trimite către Andrei blocat, fără Confirmă privat, cu anulare", () => {
    const marked = t({ ...base, seller_type: "agentie", outreach_status: "blocked_agency", agency_marked_at: "2026-11-22T19:00:00Z" });
    expect(isAgencyListing(marked)).toBe(true);
    expect(triageBlockReason(marked)).toBe("Agenție blocată");
    expect(isReadyForOutreach(marked)).toBe(false);
    expect(privateConfirmMode(marked)).toBeNull();
    expect(agencyMarkMode(marked)).toBe("undo");
    expect(triageReasonHint(marked, "Agenție blocată")).toContain("Marcat manual ca agenție");
  });
  it("contorul „Pregătite pentru prospectare” scade după marcare, iar filtrele rămân aceleași", () => {
    const before = groupCrossPortalDuplicates([olx, imo, solo]);
    const filters = { ...DEFAULT_TRIAGE_FILTERS, hideDuplicates: false, portal: "olx" };
    expect(summarizeTriage(before).ready).toBe(1);
    const markedOlx = { ...olx, seller_type: "agentie", outreach_status: "blocked_agency", agency_marked_at: "2026-11-22T19:00:00Z" } as DedupListing;
    const after = groupCrossPortalDuplicates([markedOlx, imo, solo]);
    expect(summarizeTriage(after).ready).toBe(0);
    expect(buildTriageRows(after, filters).map((r) => r.listing.id)).toEqual(["olx"]);
  });
});

import { agencyMarkSummary, agencyUndoLabel } from "./scrapedListingsTriage";

describe("Agenție — blocare pe același număr de telefon", () => {
  const marked = { id: "a", source_platform: "OLX", source_url: "https://www.olx.ro/d/oferta/a-IDa.html", title: "2 camere",
    contact_phone: "0722123456", seller_type: "agentie", agency_marked_at: "2026-11-22T20:00:00Z" };

  it("notificarea arată câte anunțuri suplimentare au fost blocate și că numărul a intrat în listă", () => {
    const text = agencyMarkSummary({ siblings_marked: 3, siblings_cancelled: 1, cancelled_wa: 1, blocklist_added: true });
    expect(text).toContain("Am blocat încă 3 anunțuri cu același număr.");
    expect(text).toContain("Am anulat 2 trimiteri programate.");
    expect(text).toContain("Numărul a intrat în lista de agenții.");
  });

  it("un singur anunț suplimentar folosește singularul", () => {
    expect(agencyMarkSummary({ siblings_marked: 1 })).toContain("Am blocat încă 1 anunț cu același număr.");
  });

  it("anunțurile confirmate privat rămân neschimbate și numărul nu intră în listă", () => {
    const text = agencyMarkSummary({ siblings_marked: 1, skipped_private: 1, blocklist_added: false });
    expect(text).toContain("Un anunț confirmat privat cu același număr a rămas neschimbat");
    expect(text).not.toContain("Numărul a intrat în lista de agenții.");
  });

  it("fără alte anunțuri pe număr nu se menționează blocări suplimentare", () => {
    const text = agencyMarkSummary({ siblings_marked: 0, already_listed: true });
    expect(text).not.toContain("Am blocat încă");
    expect(text).toContain("Numărul era deja în lista de agenții.");
  });

  it("cardul anunțului marcat arată numărul de anunțuri blocate odată cu el", () => {
    expect(triageReasonHint({ ...marked, agency_mark_sibling_count: 2 }, "Agenție blocată"))
      .toBe("Marcat manual ca agenție — încă 2 anunțuri cu același număr blocate");
    expect(triageReasonHint({ ...marked, agency_mark_sibling_count: 0 }, "Agenție blocată"))
      .toBe("Marcat manual ca agenție — nu primește mesaje");
  });

  it("anunțul blocat pe număr explică de unde vine blocarea", () => {
    expect(triageReasonHint({ ...marked, agency_mark_root: "root" }, "Agenție blocată"))
      .toBe("Blocat automat — același număr ca un anunț marcat manual ca agenție");
  });

  it("anularea pe un grup readuce toate anunțurile deodată", () => {
    expect(agencyUndoLabel({ ...marked, agency_mark_root: "root" })).toBe("Nu e agenție — anulează tot grupul");
    expect(agencyUndoLabel({ ...marked, agency_mark_sibling_count: 2 })).toBe("Nu e agenție — anulează tot grupul");
    expect(agencyUndoLabel({ ...marked })).toBe("Nu e agenție — anulează");
  });

  it("anunțurile blocate pe număr au tot butonul de anulare, nu de marcare", () => {
    expect(agencyMarkMode({ ...marked, agency_mark_root: "root" })).toBe("undo");
  });
});

describe("butonul „Nu e agenție” pe agențiile blocate automat", () => {
  it("apare și pe anunțurile inactive blocate ca agenție", () => {
    expect(privateConfirmMode({ id: "x", title: "Apartament 2 camere", seller_type: "agentie", is_active: false, outreach_status: "blocked_agency" } as any)).toBe("override");
  });
});

import { isTriageListing } from "./scrapedListingsTriage";

describe("paginile de căutare generice nu apar în Triere", () => {
  const laproprietar = l({ id: "search", source_platform: "laproprietar.ro", source_url: "https://laproprietar.ro/imobiliare/timisoara",
    title: "Apartamente de vânzare și de închiriat în Timișoara — de la proprietar", rooms: 1, size: null, price: null });
  const storiaSearch = l({ id: "storia-search", source_platform: "Storia.ro", source_url: "https://www.storia.ro/ro/rezultate/vanzare/apartament/timis/timisoara", title: "Apartamente de vânzare: Timisoara" });
  const all = [olx, imo, solo, laproprietar, storiaSearch];

  it("nu intră în grupare și nu sunt numărate ca imobile", () => {
    const g = groupCrossPortalDuplicates(triagePool(all, DEFAULT_TRIAGE_FILTERS));
    expect(summarizeTriage(g).properties).toBe(2);
    expect(summarizeTriage(g).listings).toBe(3);
  });
  it("lipsesc din listă în orice stare, inclusiv cu „Ascunde duplicatele” oprit", () => {
    for (const status of ["all", "active", "inactive", "dismissed"] as const) {
      const f = { ...DEFAULT_TRIAGE_FILTERS, status, hideDuplicates: false, hideDismissed: false };
      const ids = buildTriageRows(groupCrossPortalDuplicates(triagePool(all, f)), f).map((r) => r.listing.id);
      expect(ids).not.toContain("search");
      expect(ids).not.toContain("storia-search");
    }
  });
  it("nici dacă ajung direct într-un grup (filtrul de rânduri le respinge)", () => {
    const g = [{ key: "search", primary: laproprietar, variants: [], reasons: {}, portals: ["laproprietar"] }];
    expect(buildTriageRows(g, DEFAULT_TRIAGE_FILTERS)).toHaveLength(0);
  });
  it("anunțurile individuale rămân", () => {
    expect(isTriageListing(olx)).toBe(true);
    expect(isTriageListing(laproprietar)).toBe(false);
  });
});

import { privateConfirmSummary } from "./scrapedListingsTriage";

describe("privateConfirmSummary", () => {
  it("numără separat anunțurile cu același număr deblocate și cele rămase agenție", () => {
    const text = privateConfirmSummary({ blocklist_removed: true, reactivated: true, siblings_checked: 36, siblings_unblocked: 2 });
    expect(text).toContain("încă 2 anunțuri");
    expect(text).toContain("34 anunțuri");
  });

  it("nu pomenește lista de agenții sau reactivarea când nu s-au schimbat", () => {
    expect(privateConfirmSummary({ siblings_checked: 0 })).toBe("");
  });
});

import { asReactivated, canReactivate } from "./scrapedListingsTriage";

describe("Anunțuri inactive (ex. blocate greșit pe domeniul portalului)", () => {
  const base = { ...ownerFields, contact_phone: "0722123456" };
  const inactive = { ...base, seller_type: "de_verificat", is_active: false, lifecycle_status: "expired" };
  it("Confirmă privat apare și pe anunțul inactiv nerenunțat", () => {
    expect(privateConfirmMode(t(inactive))).toBe("confirm");
  });
  it("Confirmă privat nu apare pe un anunț inactiv renunțat manual", () => {
    expect(privateConfirmMode(t({ ...inactive, dismissed_at: "2026-11-22T10:00:00Z" }))).toBeNull();
  });
  it("Reactivează apare doar pe inactive nerenunțate", () => {
    expect(canReactivate(t(inactive))).toBe(true);
    expect(canReactivate(t({ ...inactive, dismissed_at: "2026-11-22T10:00:00Z" }))).toBe(false);
    expect(canReactivate(t({ ...base, is_active: true }))).toBe(false);
  });
  it("după reactivare anunțul devine activ cu ciclul „new”", () => {
    const r = asReactivated(t(inactive));
    expect(r.is_active).toBe(true);
    expect(r.lifecycle_status).toBe("new");
  });
});
