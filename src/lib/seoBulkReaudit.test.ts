import { describe, it, expect } from "vitest";
import { lowScoreTargets, filterTrackedUrls } from "./seoBulkReaudit";

const urls = ["https://realtrust.ro/", "https://realtrust.ro/blog", "https://realtrust.ro/preturi", "https://realtrust.ro/nou"];
const scores = new Map([["/", 100], ["/blog", 45], ["/preturi", 69]]);

describe("re-audit pagini cu scor mic", () => {
  it("selectează doar paginile sub 70, cele mai slabe primele", () => {
    expect(lowScoreTargets(urls, scores)).toEqual(["https://realtrust.ro/blog", "https://realtrust.ro/preturi"]);
  });
  it("scorul 70 nu este considerat slab", () => {
    expect(lowScoreTargets(["https://realtrust.ro/x"], new Map([["/x", 70]]))).toEqual([]);
  });
  it("filtrul «toate» păstrează toate paginile", () => {
    expect(filterTrackedUrls(urls, scores, "all")).toHaveLength(4);
  });
});
