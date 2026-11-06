import { describe, expect, it } from "vitest";
import { MIN_NIGHTS } from "./StayCalculator";

describe("StayCalculator minimum stay", () => {
  it("requires at least 2 nights for every apartment", () => {
    expect(MIN_NIGHTS).toBe(2);
  });
});
