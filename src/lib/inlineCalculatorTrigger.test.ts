import { describe, it, expect } from "vitest";
import { tenYearSeries, requestInlineCalculator, consumePendingInlineCalculator } from "./inlineCalculatorTrigger";

describe("inline calculator trigger", () => {
  it("builds 10 cumulative years", () => {
    const s = tenYearSeries(5225);
    expect(s).toHaveLength(10);
    expect(s[0]).toBe(5225);
    expect(s[9]).toBe(52250);
  });
  it("keeps a click made before the popup loaded", () => {
    requestInlineCalculator();
    expect(consumePendingInlineCalculator()).toBe(true);
    expect(consumePendingInlineCalculator()).toBe(false);
  });
});
