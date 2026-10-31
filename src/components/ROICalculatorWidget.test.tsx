import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ROICalculatorWidget from "./ROICalculatorWidget";

const mocks = vi.hoisted(() => ({ submitLead: vi.fn(), invoke: vi.fn() }));
vi.mock("@/lib/leadSubmission", () => ({ submitLead: mocks.submitLead }));
vi.mock("@/lib/supabaseClient", () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
vi.mock("@/components/social/SocialFollow", () => ({ SocialFollow: () => null }));

async function submitCalculator() {
  render(<ROICalculatorWidget />);
  fireEvent.change(screen.getByLabelText("Suprafață utilă (mp) *"), { target: { value: "60" } });
  fireEvent.click(screen.getByRole("button", { name: /Continuă/ }));
  fireEvent.click(screen.getByRole("button", { name: /Vezi rezultatul/ }));
  fireEvent.click(screen.getByRole("button", { name: "Trimite proiecția pe WhatsApp" }));
  fireEvent.change(screen.getByLabelText("Nume"), { target: { value: "Test Calculator" } });
  fireEvent.change(screen.getByLabelText("Telefon"), { target: { value: "0722 123 456" } });
  fireEvent.click(screen.getAllByRole("button", { name: "Trimite proiecția pe WhatsApp" }).at(-1) as HTMLElement);
  await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith("handle-lead-whatsapp", expect.any(Object)));
}

describe("calculator Lead reporting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    window.dataLayer = [];
    window.fbq = vi.fn();
    window.gtag = vi.fn();
    vi.spyOn(window, "open").mockReturnValue(null);
    mocks.submitLead.mockResolvedValue({ ok: true, leadId: "test-lead" });
    mocks.invoke.mockResolvedValue({ data: {}, error: null });
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); delete window.fbq; delete window.gtag; });

  it("sends exactly one Lead with matching Pixel/CAPI ID after successful save, preserving notification", async () => {
    localStorage.setItem("cookie_consent_v2", JSON.stringify({ choice: "all", ts: Date.now() }));
    await submitCalculator();
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith("meta-conversions", expect.any(Object)));
    const pixelCalls = vi.mocked(window.fbq).mock.calls.filter(call => call[0] === "track" && call[1] === "Lead");
    const serverCalls = mocks.invoke.mock.calls.filter(call => call[0] === "meta-conversions");
    expect(pixelCalls).toHaveLength(1);
    expect(serverCalls).toHaveLength(1);
    expect(serverCalls[0][1].body.event_name).toBe("Lead");
    expect(serverCalls[0][1].body.event_id).toBe((pixelCalls[0][3] as { eventID: string }).eventID);
    expect(window.dataLayer?.filter(event => event.event === "Lead_Submit")).toHaveLength(1);
    expect(mocks.submitLead).toHaveBeenCalledTimes(1);
    expect(mocks.invoke.mock.calls.filter(call => call[0] === "handle-lead-whatsapp")).toHaveLength(1);
  });

  it.each(["declined", "analytics_only"])("saves and notifies without Meta Lead when consent is %s", async choice => {
    localStorage.setItem("cookie_consent_v2", JSON.stringify({ choice, ts: Date.now() }));
    await submitCalculator();
    expect(window.fbq).not.toHaveBeenCalled();
    expect(mocks.invoke.mock.calls.filter(call => call[0] === "meta-conversions")).toHaveLength(0);
    expect(mocks.submitLead).toHaveBeenCalledTimes(1);
  });

  it("does not report Lead when saving fails", async () => {
    localStorage.setItem("cookie_consent_v2", JSON.stringify({ choice: "all", ts: Date.now() }));
    mocks.submitLead.mockResolvedValue({ ok: false });
    await submitCalculator();
    expect(window.fbq).not.toHaveBeenCalled();
    expect(mocks.invoke.mock.calls.filter(call => call[0] === "meta-conversions")).toHaveLength(0);
  });
});