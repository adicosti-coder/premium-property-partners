import { describe, it, expect } from "vitest";
import { computeReconciliation } from "./ReconciliationCard";

describe("computeReconciliation", () => {
  it("returnează sincronizat când toate to_call au property", () => {
    const r = computeReconciliation({
      toCallProspects: [{ id: "a" }, { id: "b" }],
      migratedProperties: [
        { id: "p1", migrated_from_prospect_id: "a" },
        { id: "p2", migrated_from_prospect_id: "b" },
      ],
    });
    expect(r.asymmetry).toBe(0);
    expect(r.orphanProspects).toEqual([]);
    expect(r.orphanProperties).toEqual([]);
    expect(r.toCallCount).toBe(2);
    expect(r.migratedCount).toBe(2);
  });

  it("identifică orfani A: to_call fără property", () => {
    const r = computeReconciliation({
      toCallProspects: [{ id: "a" }, { id: "b" }, { id: "c" }],
      migratedProperties: [{ id: "p1", migrated_from_prospect_id: "a" }],
    });
    expect(r.orphanProspects.sort()).toEqual(["b", "c"]);
    expect(r.orphanProperties).toEqual([]);
    expect(r.asymmetry).toBe(2);
  });

  it("identifică orfani B: property fără to_call", () => {
    const r = computeReconciliation({
      toCallProspects: [{ id: "a" }],
      migratedProperties: [
        { id: "p1", migrated_from_prospect_id: "a" },
        { id: "p2", migrated_from_prospect_id: "ghost" },
      ],
    });
    expect(r.orphanProspects).toEqual([]);
    expect(r.orphanProperties).toEqual([{ id: "p2", prospect_id: "ghost" }]);
    expect(r.asymmetry).toBe(1);
  });

  it("ignoră properties cu migrated_from_prospect_id null", () => {
    const r = computeReconciliation({
      toCallProspects: [{ id: "a" }],
      migratedProperties: [
        { id: "p1", migrated_from_prospect_id: null },
        { id: "p2", migrated_from_prospect_id: "a" },
      ],
    });
    expect(r.migratedCount).toBe(1);
    expect(r.asymmetry).toBe(0);
  });

  it("detectează ambele tipuri de orfani simultan", () => {
    const r = computeReconciliation({
      toCallProspects: [{ id: "a" }, { id: "b" }],
      migratedProperties: [
        { id: "p1", migrated_from_prospect_id: "a" },
        { id: "p2", migrated_from_prospect_id: "x" },
      ],
    });
    expect(r.orphanProspects).toEqual(["b"]);
    expect(r.orphanProperties).toEqual([{ id: "p2", prospect_id: "x" }]);
    expect(r.asymmetry).toBe(2);
  });
});
