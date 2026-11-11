import { describe, expect, it } from "bun:test";
// Modulele Meta citesc Deno.env la încărcare; în bun simulăm doar lipsa variabilelor.
(globalThis as any).Deno ??= { env: { get: () => undefined } };
const { adminApprovalSummary } = await import("./listingInspection.ts");
const { recontactBlocker, WA_OWNER_RECONTACT_BODY, OWNER_RECONTACT_AFTER_DAYS } = await import("./waOwnerRecontact.ts");

describe("alerta de aprobare 1/2 pentru admin", () => {
  it("rezumatul are zona, tipul, prețul, chiria estimată și scorul /10", () => {
    expect(adminApprovalSummary({ zone: "Iosefin", isRent: false, price: 85000, estimateMonthly: 420, leadScore: 73 })).toBe([
      "*[APROBARE NOUĂ]:* Anunț în zona Iosefin (Vânzare)",
      "Preț cerut: 85.000 €",
      "Chirie/Randament estimat: 420 €/lună",
      "Scor Lead: 7,3/10",
      "Răspunde cu 1 (Aprobă) sau 2 (Respinge).",
    ].join("\n"));
  });
  it("închiriere: prețul e pe lună; lipsa datelor apare ca „—”, nu inventată", () => {
    const s = adminApprovalSummary({ zone: "Fabric", isRent: true, price: 450, estimateMonthly: null, leadScore: null });
    expect(s).toContain("(Închiriere)");
    expect(s).toContain("Preț cerut: 450 €/lună");
    expect(s).toContain("Chirie/Randament estimat: —");
    expect(s).toContain("Scor Lead: —/10");
  });
});

describe("re-contactarea unică la 30 de zile", () => {
  const now = new Date("2026-12-15T10:00:00Z");
  const base = { outreach_status: "whatsapp_delivered", outreach_status_at: "2026-11-10T10:00:00Z", outreach_recontact_at: null, lifecycle_status: "new", expiry_check_status: "ok", do_not_call: false };
  it("textul este cel aprobat, cu zona și linkul", () => {
    expect(WA_OWNER_RECONTACT_BODY).toBe("Bună ziua! Am văzut că apartamentul dumneavoastră din {{1}} este încă disponibil. Avem noi cereri de la investitori și clienți calificați în zonă. Doriți să îl prezentăm acestora? {{2}}");
    expect(OWNER_RECONTACT_AFTER_DAYS).toBe(30);
  });
  it("eligibil după 30 de zile fără răspuns, cu anunțul activ", () => {
    expect(recontactBlocker(base, now)).toBeNull();
  });
  it("nu înainte de 30 de zile, nu de două ori, nu pe anunțuri inactive sau refuzate", () => {
    expect(recontactBlocker({ ...base, outreach_status_at: "2026-11-20T10:00:00Z" }, now)).toBe("too_early");
    expect(recontactBlocker({ ...base, outreach_recontact_at: "2026-12-01T10:00:00Z" }, now)).toBe("already_recontacted");
    expect(recontactBlocker({ ...base, expiry_check_status: "inactiv_sursa" }, now)).toBe("inactive_on_source");
    expect(recontactBlocker({ ...base, outreach_status: "replied" }, now)).toBe("status");
    expect(recontactBlocker({ ...base, outreach_status: "unsubscribed" }, now)).toBe("status");
    expect(recontactBlocker({ ...base, do_not_call: true }, now)).toBe("excluded");
  });
});
