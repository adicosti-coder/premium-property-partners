import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/lib/supabaseClient", () => ({ supabase: {}, supabaseConfig: { url: "http://localhost" }, getSupabasePublishableKey: () => "" }));
vi.mock("@/lib/leadSubmission", () => ({ submitLead: vi.fn() }));
vi.mock("@/components/social/SocialFollow", () => ({ SocialFollow: () => null }));
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
    fireEvent.click(screen.getByRole("button", { name: /Trimite proiecția pe WhatsApp/ }));
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
  });
});
