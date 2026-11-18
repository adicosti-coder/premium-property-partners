import { describe, expect, it } from "vitest";
import { deviceClassForWidth, pageGroupForPath, shouldReportVitals } from "./webVitalsBeacon";

describe("web vitals reporting", () => {
  it("reports only from the live site, never from preview or localhost", () => {
    expect(shouldReportVitals("realtrust.ro")).toBe(true);
    expect(shouldReportVitals("www.realtrust.ro")).toBe(true);
    expect(shouldReportVitals("localhost")).toBe(false);
    expect(shouldReportVitals("id-preview--b9975a45-416b-429b-b6fa-9e3d771a5693.lovable.app")).toBe(false);
  });

  it("splits phones from computers at 767px", () => {
    expect(deviceClassForWidth(412)).toBe("mobile");
    expect(deviceClassForWidth(767)).toBe("mobile");
    expect(deviceClassForWidth(768)).toBe("desktop");
  });

  it("groups listing and article pages by template", () => {
    expect(pageGroupForPath("/")).toBe("/");
    expect(pageGroupForPath("/cazare/")).toBe("/cazare");
    expect(pageGroupForPath("/proprietati/apartament-2-camere-123")).toBe("/proprietati/:detaliu");
    expect(pageGroupForPath("/blog/regim-hotelier-timisoara?lang=en")).toBe("/blog/:detaliu");
  });
});
