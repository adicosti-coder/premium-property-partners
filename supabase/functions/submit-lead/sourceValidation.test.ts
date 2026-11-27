import { expect, test } from "bun:test";
import { normalizeLeadSource } from "./sourceValidation.ts";

test("ROI and quick-estimate forms keep their attribution when saved securely", () => {
  for (const source of [
    "calculator_roi_widget",
    "pre_calc_owner",
    "pentru_proprietari_precalc",
    "homepage_owners_teaser",
  ]) {
    expect(normalizeLeadSource(source)).toBe(source);
  }
});

test("unknown lead sources still fall back safely", () => {
  expect(normalizeLeadSource("unknown_source")).toBe("calculator");
  expect(normalizeLeadSource(null)).toBe("calculator");
});
