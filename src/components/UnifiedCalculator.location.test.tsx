import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/lib/supabaseClient", () => ({ supabase: {}, supabaseConfig: { url: "http://localhost" }, getSupabasePublishableKey: () => "" }));
vi.mock("@/lib/leadSubmission", () => ({ submitLead: vi.fn() }));
vi.mock("@/components/social/SocialFollow", () => ({ SocialFollow: () => null }));
vi.mock("@/i18n/LanguageContext", () => ({ useLanguage: () => ({ language: "ro" }) }));
const track = vi.fn();
vi.mock("@/lib/calculatorAnalytics", async (orig) => ({ ...(await orig<object>()), trackCalculatorEvent: (...a: unknown[]) => track(...a) }));

import UnifiedCalculator from "./UnifiedCalculator";

afterEach(() => { cleanup(); track.mockReset(); });

describe("UnifiedCalculator regional location end-to-end", () => {
  it("uses the selected suggestion in the result and analytics", () => {
    render(<UnifiedCalculator />);
    fireEvent.click(screen.getByRole("button", { name: /Altă localitate \/ Regional/ }));
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "baile felix" } });
    fireEvent.click(screen.getByRole("option", { name: "Băile Felix" }));
    expect(input).toHaveValue("Băile Felix");
    fireEvent.change(screen.getByLabelText(/Suprafață utilă/), { target: { value: "60" } });
    fireEvent.click(screen.getByRole("button", { name: /Continuă/ }));
    fireEvent.click(screen.getByRole("button", { name: /Vezi rezultatul/ }));
    expect(screen.getByText(/· Băile Felix · 60 mp ·/)).toBeInTheDocument();
    const view = track.mock.calls.find(([name]) => name === "calculator_result_view");
    expect(view?.[1]).toMatchObject({ location_mode: "regional", location_name: "Băile Felix", surface_sqm: 60 });
  });
});
