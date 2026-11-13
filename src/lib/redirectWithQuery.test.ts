import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { withPreservedQuery } from "./redirectWithQuery";

describe("legacy redirects keep the query string", () => {
  it("/pentru-oaspeti?lang=en goes to /cazare?lang=en", () => {
    expect(withPreservedQuery("/cazare", "?lang=en")).toBe("/cazare?lang=en");
  });

  it("keeps every parameter and the hash", () => {
    expect(withPreservedQuery("/cazare", "?lang=en&utm_source=fb", "#top")).toBe("/cazare?lang=en&utm_source=fb#top");
  });

  it("adds nothing when there is no query", () => {
    expect(withPreservedQuery("/cazare", "", "")).toBe("/cazare");
  });

  it("no route redirect in App drops the query string", () => {
    const app = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
    expect(app).not.toMatch(/element=\{<Navigate to="/);
  });
});
