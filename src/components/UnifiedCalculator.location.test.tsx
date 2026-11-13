import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/lib/supabaseClient", () => ({ supabase: {}, supabaseConfig: { url: "http://localhost" }, getSupabasePublishableKey: () => "" }));
vi.mock("@/lib/leadSubmission", () => ({ submitLead: vi.fn() }));
vi.mock("@/components/social/SocialFollow", () => ({ SocialFollow: () => null }));
const pdfSave = vi.fn();
vi.mock("@/utils/exportCalculatorReportPdf", () => ({ generateCalculatorReportPdf: vi.fn().mockResolvedValue({ save: (...a: unknown[]) => pdfSave(...a) }) }));
vi.mock("@/i18n/LanguageContext", () => ({ useLanguage: () => ({ language: "ro" }) }));
const track = vi.fn();
vi.mock("@/lib/calculatorAnalytics", async (orig) => ({ ...(await orig<object>()), trackCalculatorEvent: (...a: unknown[]) => track(...a) }));

import UnifiedCalculator from "./UnifiedCalculator";

afterEach(() => { cleanup(); track.mockReset(); vi.useRealTimers(); });

describe("UnifiedCalculator regional location end-to-end", () => {
  it("uses the selected suggestion in the result and analytics", async () => {
    vi.useFakeTimers();
    render(<UnifiedCalculator />);
    fireEvent.click(screen.getByRole("button", { name: /Altă localitate \/ Regional/ }));
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "baile felix" } });
    fireEvent.click(screen.getByRole("option", { name: "Băile Felix" }));
    expect(input).toHaveValue("Băile Felix");
    fireEvent.change(screen.getByLabelText(/Suprafață utilă/), { target: { value: "60" } });
    expect(screen.getByText(/· Băile Felix · 60 mp ·/)).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(1200); });
    expect(track.mock.calls.some(([name]) => name === "calculator_result_view")).toBe(true);
    const view = track.mock.calls.find(([name]) => name === "calculator_result_view");
    expect(view?.[1]).toMatchObject({ location_mode: "regional", location_name: "Băile Felix", surface_sqm: 60 });
  });
});

describe("UnifiedCalculator lead request integration", () => {
  it("sends the selected location to both lead endpoints with results computed for it", async () => {
    const { submitLead } = await import("@/lib/leadSubmission");
    const { supabase } = await import("@/lib/supabaseClient");
    const { computeUnified } = await import("@/lib/unifiedCalculator");
    const invoke = vi.fn().mockResolvedValue({ error: null });
    (supabase as { functions?: unknown }).functions = { invoke };
    vi.mocked(submitLead).mockResolvedValue({ ok: true, duplicate: false, leadId: "00000000-0000-0000-0000-000000000123" });
    vi.spyOn(window, "open").mockReturnValue(null);

    render(<UnifiedCalculator />);
    fireEvent.click(screen.getByRole("button", { name: /Altă localitate \/ Regional/ }));
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "sinaia" } });
    fireEvent.click(screen.getByRole("option", { name: "Sinaia" }));
    fireEvent.change(screen.getByLabelText(/Suprafață utilă/), { target: { value: "60" } });
    fireEvent.click(screen.getByRole("button", { name: /Descarcă raportul PDF complet/ }));
    fireEvent.change(screen.getByLabelText("Nume"), { target: { value: "Test" } });
    fireEvent.change(screen.getByLabelText("Telefon"), { target: { value: "0722 123 456" } });
    const form = screen.getByLabelText("Nume").closest("form");
    if (!form) throw new Error("Missing request form");
    fireEvent.submit(form);

    await vi.waitFor(() => expect(invoke).toHaveBeenCalled());
    const lead = vi.mocked(submitLead).mock.calls[0][0] as { message: string; simulation_data: Record<string, unknown> };
    expect(lead.message).toContain("Locație: Sinaia");
    expect(lead.simulation_data).toMatchObject({ zone: "Sinaia", surface_sqm: 60 });
    const [fn, { body }] = invoke.mock.calls[0];
    expect(fn).toBe("handle-lead-whatsapp");
    expect(body).toMatchObject({ zona: "Sinaia", location_mode: "regional", suprafata_mp: 60 });
    const expected = computeUnified({ type: body.property_type ?? lead.simulation_data.property_type, zone: "centru", surface: 60, parking: body.parcare, finish: body.finisaje, manual: undefined, locationMode: "regional" } as never);
    expect(body.venit_estimat_min).toBe(expected.netMin);
    expect(body.venit_estimat_max).toBe(expected.netMax);
    expect(lead.simulation_data.realtrust_net).toBe(expected.netMid);
    expect(screen.queryByText(/Locație: Timișoara/)).toBeNull();
    await vi.waitFor(() => expect(pdfSave).toHaveBeenCalled());
    expect(lead.simulation_data).toMatchObject({ lead_tag: "Calculator", intent: "toate", market_alert_opt_in: false, sale_value_mid: null });
  });
});

describe("UnifiedCalculator WhatsApp and prefill", () => {
  it("opens WhatsApp directly with the simulation figures", () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(<UnifiedCalculator />);
    fireEvent.click(screen.getByRole("button", { name: "Vreau să vând" }));
    fireEvent.click(screen.getByRole("button", { name: /Continuă pe WhatsApp/ }));
    const url = decodeURIComponent(String(open.mock.calls[0][0]));
    expect(url).toContain("https://wa.me/40799069256?text=");
    expect(url).toContain("Intenție: Vreau să vând");
    expect(url).toContain("Valoare de vânzare:");
    expect(url).toContain("Venit net regim hotelier:");
    expect(open.mock.calls[0][2]).toBe("noopener,noreferrer");
  });
  it("pre-fills from an outbound link and greets the owner", () => {
    window.history.replaceState(null, "", "/?zona=fructus&camere=3&mp=80&nume=Maria&intentie=chirie");
    render(<UnifiedCalculator />);
    expect(screen.getByText(/Bună, Maria!/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Suprafață utilă/)).toHaveValue("80");
    expect(screen.getByRole("button", { name: "Chirie clasică" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/3 camere · Fructus Plaza · 80 mp/)).toBeInTheDocument();
    window.history.replaceState(null, "", "/");
  });
});
