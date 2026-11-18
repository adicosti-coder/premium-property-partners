import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ro } from "@/i18n/translations.ro";

// The static hero shell in index.html must show exactly the same subtitle as
// the React hero. If React paints a longer paragraph, the browser records it as
// a new (late) Largest Contentful Paint and mobile LCP jumps by ~1.5s.
const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
const decode = (s: string) => s.replace(/<br\s*\/?>/g, "\n").replace(/&amp;/g, "&").trim();

describe("homepage static hero shell", () => {
  it("subtitle matches the React hero subtitle word for word", () => {
    const match = html.match(/<p class="ash-sub">([\s\S]*?)<\/p>/);
    expect(match).not.toBeNull();
    expect(decode(match![1])).toBe(ro.hero.subtitle);
  });

  it("headline lines match the React hero headline", () => {
    const h1 = html.match(/<h1 class="ash-h1">([\s\S]*?)<\/h1>/)![1];
    expect(h1).toContain(ro.hero.title);
    expect(h1).toContain(ro.hero.titleMid);
    expect(h1).toContain(ro.hero.titleHighlight);
  });
});
