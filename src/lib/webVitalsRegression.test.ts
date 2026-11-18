import { describe, expect, it } from "vitest";
import { evaluateRegression, rateVital, regressionAlertKey } from "../../supabase/functions/_shared/webVitalsRegression";

describe("Core Web Vitals regression rules", () => {
  it("uses Google's p75 thresholds: LCP 2.5 s / 4 s, CLS 0.1 / 0.25, INP 200 / 500 ms", () => {
    expect(rateVital("LCP", 2500)).toBe("good");
    expect(rateVital("LCP", 2501)).toBe("needs-improvement");
    expect(rateVital("LCP", 4001)).toBe("poor");
    expect(rateVital("CLS", 0.1)).toBe("good");
    expect(rateVital("CLS", 0.26)).toBe("poor");
    expect(rateVital("INP", 200)).toBe("good");
    expect(rateVital("INP", 501)).toBe("poor");
  });

  it("never judges a window with fewer than 30 readings", () => {
    expect(evaluateRegression("LCP", "mobile", { samples: 29, p75: 6000 }, { samples: 200, p75: 2000 })).toBeNull();
  });

  it("never alerts while p75 is still good, even if it got worse", () => {
    expect(evaluateRegression("LCP", "mobile", { samples: 50, p75: 2400 }, { samples: 200, p75: 1500 })).toBeNull();
  });

  it("alerts when p75 is at least 20% worse than the two weeks before", () => {
    const v = evaluateRegression("LCP", "mobile", { samples: 50, p75: 3100 }, { samples: 200, p75: 2400 });
    expect(v?.severity).toBe("warning");
  });

  it("ignores a steady value that was already above the good threshold", () => {
    expect(evaluateRegression("INP", "mobile", { samples: 80, p75: 232 }, { samples: 300, p75: 225 })).toBeNull();
  });

  it("raises an error when p75 newly crosses into poor", () => {
    const v = evaluateRegression("CLS", "desktop", { samples: 40, p75: 0.3 }, { samples: 100, p75: 0.27 });
    expect(v).toBeNull(); // already poor before: not new
    const w = evaluateRegression("CLS", "desktop", { samples: 40, p75: 0.3 }, { samples: 100, p75: 0.2 });
    expect(w?.severity).toBe("error");
  });

  it("without a usable baseline alerts only on poor values", () => {
    expect(evaluateRegression("LCP", "mobile", { samples: 40, p75: 3000 }, { samples: 10, p75: 1000 })).toBeNull();
    expect(evaluateRegression("LCP", "mobile", { samples: 40, p75: 4500 }, null)?.severity).toBe("error");
  });

  it("allows one alert per metric, device and day", () => {
    const d = new Date("2026-11-18T09:00:00Z");
    expect(regressionAlertKey("LCP", "mobile", d)).toBe("LCP|mobile|2026-11-18");
  });
});
