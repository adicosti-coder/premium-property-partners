import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import PreCalcMiniForm from "./PreCalcMiniForm";

const mocks = vi.hoisted(() => ({ submitLead: vi.fn(), invoke: vi.fn() }));
vi.mock("@/lib/leadSubmission", () => ({ submitLead: mocks.submitLead }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
vi.mock("@/i18n/LanguageContext", () => ({ useLanguage: () => ({ language: "ro" }) }));
vi.mock("@/lib/campaignAttribution", () => ({
  withCampaignTracking: (value: unknown) => value,
  getCtaVariant: () => "a",
}));
vi.mock("@/lib/conversionTracking", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/conversionTracking")>()),
  trackCriticalConversion: vi.fn(),
}));
vi.mock("@/components/forms/FormTrustBadges", () => ({ default: () => null }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("PreCalcMiniForm WhatsApp lead delivery", () => {
  it("saves securely and sends the visitor capability with the WhatsApp request", async () => {
    mocks.submitLead.mockResolvedValue({
      ok: true,
      leadId: "00000000-0000-0000-0000-000000000123",
      reportToken: "a".repeat(64),
    });
    mocks.invoke.mockResolvedValue({ data: { ok: true }, error: null });

    render(<PreCalcMiniForm source="pentru_proprietari_precalc" />);
    fireEvent.change(screen.getByLabelText("Numele tău"), { target: { value: "Test Proprietar" } });
    fireEvent.change(screen.getByLabelText("Telefon"), { target: { value: "0722 123 456" } });
    fireEvent.click(screen.getByRole("button", { name: /Continuă/ }));
    fireEvent.click(screen.getByRole("button", { name: /Vezi estimarea/ }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Rezervă consultanță gratuită/ }));
    });

    await vi.waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith("handle-lead-whatsapp", expect.any(Object)));
    expect(await screen.findByText("Consultanța e rezervată")).toBeInTheDocument();
    expect(mocks.submitLead).toHaveBeenCalledWith(expect.objectContaining({
      source: "pentru_proprietari_precalc",
      whatsapp_number: "+40 722 123 456",
      viaServer: true,
    }));
    expect(mocks.invoke).toHaveBeenCalledWith("handle-lead-whatsapp", expect.objectContaining({
      body: expect.objectContaining({
        lead_id: "00000000-0000-0000-0000-000000000123",
        report_token: "a".repeat(64),
      }),
    }));
  });
});
