import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CalculatorLeadForm } from "./CalculatorLeadForm";
import { buildInvestmentLeadRequest } from "@/lib/calculatorLeads";

const submitLead = vi.fn();
const invoke = vi.fn();
vi.mock("@/lib/leadSubmission", () => ({ submitLead: (...args: unknown[]) => submitLead(...args) }));
vi.mock("@/lib/supabaseClient", () => ({ supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } } }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

afterEach(() => { cleanup(); submitLead.mockReset(); invoke.mockReset(); });

describe("CalculatorLeadForm", () => {
  it("saves once and sends the same lead id to the shared WhatsApp endpoint", async () => {
    submitLead.mockResolvedValue({ ok: true, leadId: "00000000-0000-0000-0000-000000000123" });
    invoke.mockResolvedValue({ data: { delivery: { visitor: { status: "sent" } } }, error: null });
    const request = buildInvestmentLeadRequest({ purchasePrice: 120000, renovation: 8000, netYieldPct: 5.52, annualNet: 7065.6, estimatedRent: 633 });
    render(<CalculatorLeadForm request={request} triggerLabel="Primește analiza" title="Analiza" description="Test" />);

    fireEvent.click(screen.getByRole("button", { name: "Primește analiza" }));
    fireEvent.change(screen.getByLabelText("Nume"), { target: { value: "Test Investitor" } });
    fireEvent.change(screen.getByLabelText("Telefon WhatsApp"), { target: { value: "0723 154 520" } });
    const form = screen.getByLabelText("Nume").closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);

    await vi.waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    expect(submitLead).toHaveBeenCalledTimes(1);
    expect(submitLead.mock.calls[0][0]).toMatchObject({ source: "calculator_unificat_investitii", viaServer: true });
    expect(submitLead.mock.calls[0][0].simulation_data).toMatchObject({ calculator_kind: "investment", lead_tag: "[Lead Investitor]", purchase_price: 120000, profit_10y: 70656 });
    expect(invoke).toHaveBeenCalledWith("handle-lead-whatsapp", expect.objectContaining({ body: expect.objectContaining({ calculator_kind: "investment", lead_tag: "[Lead Investitor]", lead_id: "00000000-0000-0000-0000-000000000123" }) }));
    expect(await screen.findByText(/Confirmarea WhatsApp a fost trimisă/)).toBeInTheDocument();
  });
});
