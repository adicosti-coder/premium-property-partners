import { expect, test } from "bun:test";
import { CTA_MARKER, filterInternalLinks, polishArticle } from "./blogSeoPolish.ts";

const allowed = new Set(["/pentru-proprietari", "/blog/ghid-iosefin", "/complexe/ring"]);

test("unknown internal links become plain text, known ones stay", () => {
  const out = filterInternalLinks("[a](/blog/inventat) si [b](/complexe/ring)", allowed);
  expect(out).toBe("a si [b](/complexe/ring)");
});

test("absolute realtrust.ro links are normalized to paths", () => {
  expect(filterInternalLinks("[x](https://realtrust.ro/blog/ghid-iosefin)", allowed)).toBe("[x](/blog/ghid-iosefin)");
});

test("exactly one CTA at the end even when re-optimized", () => {
  const once = polishArticle("## Intro\ntext", allowed);
  const twice = polishArticle(once, allowed);
  expect(twice.split(CTA_MARKER).length - 1).toBe(1);
  expect(twice.trim().endsWith("(/investitii)")).toBe(true);
});

test("SEO labels are removed from the body", () => {
  const out = polishArticle("Meta descriere: ceva\nCuvinte cheie: a, b\n## Titlu\ntext", allowed);
  expect(out.includes("Meta descriere")).toBe(false);
  expect(out.includes("Cuvinte cheie")).toBe(false);
});
