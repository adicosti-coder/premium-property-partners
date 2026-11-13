import { describe, expect, it } from "vitest";
import { UNIFIED_ZONES } from "./unifiedCalculator";
import {
  MARKET_ALERT_ZONES,
  alertPeriodMonth,
  buildMonthlyAlertPayload,
  pickMarketIndex,
  resolveAlertZoneKey,
  selectAlertSubscribers,
  type AlertLead,
  type MarketIndexRow,
} from "../../supabase/functions/_shared/monthlyMarketAlert";

const lead = (over: Partial<AlertLead> & { sd?: Record<string, unknown> } = {}): AlertLead => ({
  id: over.id ?? "l1",
  name: "Ana Pop",
  email: over.email ?? null,
  property_type: "2-camere",
  created_at: over.created_at ?? "2026-11-10T10:00:00Z",
  archived_at: over.archived_at ?? null,
  anonymized_at: null,
  phone: over.phone === undefined ? "40722111222" : over.phone,
  simulation_data: { market_alert_opt_in: true, market_alert_zone_key: "xcity", property_type: "2-camere", ...over.sd },
});
const opts = { indexedZones: new Set(["xcity", "central"]), dncPhones: new Set<string>(), blockedEmails: new Set<string>() };
const idx = (over: Partial<MarketIndexRow> = {}): MarketIndexRow => ({
  zone_key: "xcity", rooms: 0, sale_eur_sqm: "2380", rent_eur_month: 550, source: "Anunțuri XCity", source_url: null, period_month: "2026-11-01", ...over,
});

describe("alerta lunară de piață", () => {
  it("zonele alertei sunt exact zonele calculatorului", () => {
    expect(MARKET_ALERT_ZONES).toEqual(Object.fromEntries(UNIFIED_ZONES.map((z) => [z.value, z.label])));
  });

  it("găsește cartierul după cheie sau după eticheta salvată, dar nu pentru zone regionale", () => {
    expect(resolveAlertZoneKey({ market_alert_zone_key: "vivalia" })).toBe("vivalia");
    expect(resolveAlertZoneKey({ market_alert_zone: "Central / Iosefin / Elisabetin" })).toBe("central");
    expect(resolveAlertZoneKey({ location_mode: "regional", market_alert_zone: "Arad" })).toBeNull();
  });

  it("trimite doar celor care au bifat alerta și nu s-au dezabonat", () => {
    const r = selectAlertSubscribers([
      lead({ id: "ok" }),
      lead({ id: "stop", phone: "40733000111", sd: { market_alert_unsubscribed_at: "2026-11-12T00:00:00Z" } }),
      lead({ id: "nobif", phone: "40744000111", sd: { market_alert_opt_in: false } }),
    ], opts);
    expect(r.eligible.map((s) => s.lead.id)).toEqual(["ok"]);
    expect(r.excluded).toEqual([{ lead_id: "stop", reason: "dezabonat" }]);
  });

  it("o dezabonare pe o cerere oprește alerta pentru toate cererile aceluiași contact", () => {
    const r = selectAlertSubscribers([
      lead({ id: "nou", created_at: "2026-11-12T00:00:00Z" }),
      lead({ id: "vechi", created_at: "2026-11-01T00:00:00Z", sd: { market_alert_unsubscribed_at: "2026-11-05T00:00:00Z" } }),
    ], opts);
    expect(r.eligible).toHaveLength(0);
  });

  it("exclude numerele din lista „Nu contacta” și trimite o singură alertă per contact (cererea cea mai nouă)", () => {
    const r = selectAlertSubscribers([
      lead({ id: "vechi", created_at: "2026-11-01T00:00:00Z" }),
      lead({ id: "nou", created_at: "2026-11-12T00:00:00Z" }),
      lead({ id: "dnc", phone: "40755000111" }),
    ], { ...opts, dncPhones: new Set(["40755000111"]) });
    expect(r.eligible.map((s) => s.lead.id)).toEqual(["nou"]);
    expect(r.excluded).toContainEqual({ lead_id: "dnc", reason: "lista_dnc" });
    expect(r.excluded).toContainEqual({ lead_id: "vechi", reason: "duplicat_contact" });
  });

  it("exclude zonele fără indice de piață", () => {
    const r = selectAlertSubscribers([lead({ sd: { market_alert_zone_key: "alenia" } })], opts);
    expect(r.excluded).toEqual([{ lead_id: "l1", reason: "zona_fara_indice" }]);
  });

  it("alege indicele cu același număr de camere, altfel cel general", () => {
    const rows = [idx(), idx({ rooms: 2, sale_eur_sqm: 2400 })];
    expect(pickMarketIndex(rows, "xcity", 2)?.sale_eur_sqm).toBe(2400);
    expect(pickMarketIndex(rows, "xcity", 3)?.rooms).toBe(0);
  });

  it("pune valorile vechi și pe cele curente în payload, cu variația procentuală", () => {
    const sub = selectAlertSubscribers([lead({ email: "Ana@Ex.ro" })], opts).eligible[0];
    const p = buildMonthlyAlertPayload({
      sub, current: idx(), periodMonth: "2026-12-01",
      previous: { Luna: "2026-10", Vanzare_EUR_mp: 2300, Chirie_Clasica_EUR_luna: 550 },
    });
    expect(p.Nume).toBe("Ana Pop");
    expect(p.Contact).toEqual({ Telefon: "40722111222", Email: "ana@ex.ro" });
    expect(p.Cartier).toEqual({ Nume: "XCity Towers", Cheie: "xcity" });
    expect(p.Valori_Vechi?.Vanzare_EUR_mp).toBe(2300);
    expect(p.Valori_Curente_Luna_Asta).toMatchObject({ Luna: "2026-11", Vanzare_EUR_mp: 2380, Chirie_Clasica_EUR_luna: 550 });
    expect(p.Variatie_Procente).toEqual({ Vanzare_EUR_mp: 3.5, Chirie_Clasica_EUR_luna: 0 });
    expect(p.Prima_Alerta).toBe(false);
  });

  it("la prima alertă nu inventează valori vechi", () => {
    const sub = selectAlertSubscribers([lead()], opts).eligible[0];
    const p = buildMonthlyAlertPayload({ sub, current: idx(), previous: null, periodMonth: "2026-11-01" });
    expect(p.Prima_Alerta).toBe(true);
    expect(p.Valori_Vechi).toBeNull();
    expect(p.Variatie_Procente.Vanzare_EUR_mp).toBeNull();
  });

  it("luna alertei se calculează după ora României", () => {
    expect(alertPeriodMonth(new Date("2026-11-30T22:30:00Z"))).toBe("2026-12-01");
  });
});
