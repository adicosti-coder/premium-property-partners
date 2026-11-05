import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { RegionalLocationInput } from "./RegionalLocationInput";
import { trackCalculatorEvent } from "@/lib/calculatorAnalytics";

function setup(language: "ro" | "en" = "ro") {
  function Field() {
    const [value, setValue] = useState("");
    return <RegionalLocationInput value={value} language={language} onChange={setValue} />;
  }
  render(<Field />);
  const input = screen.getByRole("combobox");
  fireEvent.focus(input);
  return input;
}

afterEach(cleanup);

describe("autocomplete loading and empty states", () => {
  it("never shows a loading state because suggestions are computed instantly", () => {
    const input = setup();
    fireEvent.change(input, { target: { value: "sin" } });
    expect(input).not.toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).not.toHaveTextContent(/se încarcă|loading/i);
    expect(screen.getByRole("status")).toHaveTextContent("1 sugestie disponibilă.");
  });

  it("announces no results politely in Romanian and English", () => {
    for (const [lang, text] of [["ro", "Nicio sugestie pentru „Murani, Timiș”"], ["en", "No suggestions for “Murani, Timiș”"]] as const) {
      const input = setup(lang);
      fireEvent.change(input, { target: { value: "Murani, Timiș" } });
      const status = screen.getByRole("status");
      expect(status).toHaveAttribute("aria-live", "polite");
      expect(status).toHaveAttribute("aria-atomic", "true");
      expect(status).toHaveTextContent(text);
      expect(input.getAttribute("aria-describedby")).toContain("uc-location-status");
      expect(input).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByRole("listbox")).toBeNull();
      cleanup();
    }
  });

  it("clears the no-results announcement once matches return", () => {
    const input = setup();
    fireEvent.change(input, { target: { value: "zzz" } });
    expect(screen.getByRole("status")).toHaveTextContent("Nicio sugestie");
    fireEvent.change(input, { target: { value: "mamaia" } });
    expect(screen.getByRole("status")).toHaveTextContent("1 sugestie disponibilă.");
    expect(screen.getByRole("status")).not.toHaveTextContent("Nicio sugestie");
  });
});

describe("late search results", () => {
  it("shows only suggestions for the latest text after fast typing", () => {
    vi.useFakeTimers();
    try {
      const input = setup();
      fireEvent.change(input, { target: { value: "mamaia" } });
      fireEvent.change(input, { target: { value: "sinaia" } });
      act(() => { vi.advanceTimersByTime(2000); });
      expect(screen.getByRole("option", { name: "Sinaia" })).toBeInTheDocument();
      expect(screen.queryByRole("option", { name: "Mamaia" })).toBeNull();
    } finally { vi.useRealTimers(); }
  });

  it("keeps the newest suggestions when an older search finishes later", async () => {
    const input = setup();
    fireEvent.change(input, { target: { value: "bra" } });
    const older = new Promise((resolve) => setTimeout(resolve, 20));
    fireEvent.change(input, { target: { value: "sibiu" } });
    await act(async () => { await older; });
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Sibiu"]);
  });
});

describe("custom location privacy in analytics", () => {
  beforeEach(() => {
    window.dataLayer = []; window.gtag = vi.fn();
    localStorage.setItem("cookie_consent_v2", JSON.stringify({ choice: "analytics_only", ts: Date.now() }));
  });
  afterEach(() => localStorage.clear());

  it.each(["Murani, Timiș", "Strada Florilor 12, Ion 0723154520", "  sanmartin  "])("never sends the typed name %s", (custom) => {
    for (const event of ["calculator_location_mode_select", "calculator_result_view", "calculator_lead_submit"] as const) {
      trackCalculatorEvent(event, { location_mode: "regional", location_name: custom });
    }
    const sent = JSON.stringify(vi.mocked(window.gtag!).mock.calls) + JSON.stringify(window.dataLayer);
    expect(sent).not.toContain(custom.trim());
    expect(sent).not.toContain("0723154520");
    for (const call of vi.mocked(window.gtag!).mock.calls) expect((call[2] as Record<string, unknown>).location_name).toBe("other");
  });
});
