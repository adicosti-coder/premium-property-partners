import { describe, expect, it } from "vitest";
import { traceRedirect, type FetchLike } from "../../supabase/functions/_shared/redirectTrace";
import { classifyInspection, realIndexingIssues } from "../../supabase/functions/_shared/gscIndexingClassification";

type Page = { status: number; location?: string; html?: string; xRobots?: string };

const fakeSite = (pages: Record<string, Page>): FetchLike => async (url) => {
  const p = pages[url];
  if (!p) return { status: 404, headers: { get: () => null }, text: async () => "" };
  return {
    status: p.status,
    headers: { get: (n: string) => (n.toLowerCase() === "location" ? p.location ?? null : n.toLowerCase() === "x-robots-tag" ? p.xRobots ?? null : null) },
    text: async () => p.html ?? "",
  };
};

const refreshDoc = (to: string) =>
  `<html><head><link rel="canonical" href="${to}" /><meta http-equiv="refresh" content="0; url=${to}" /></head></html>`;
const article = (self: string) => `<html><head><meta name="robots" content="index, follow" /><link rel="canonical" href="${self}" /></head></html>`;

const OLD = "https://realtrust.ro/blog/chirii-termen-lung-apartamente-nzeb-timisoara";
const NEW = "https://realtrust.ro/blog/apartamente-nzeb-timisoara-lista-completa-2026-impact-roi";

describe("redirect cleanliness", () => {
  it("accepts the site's HTML redirect document to an indexable article", async () => {
    const r = await traceRedirect(OLD, fakeSite({ [OLD]: { status: 200, html: refreshDoc(NEW) }, [NEW]: { status: 200, html: article(NEW) } }));
    expect(r).toMatchObject({ clean: true, hops: 1, finalUrl: NEW });
  });

  it("accepts a destination without a canonical tag in the raw HTML (self-canonical by default)", async () => {
    const r = await traceRedirect(OLD, fakeSite({ [OLD]: { status: 200, html: refreshDoc(NEW) }, [NEW]: { status: 200, html: "<html></html>" } }));
    expect(r.clean).toBe(true);
  });

  it("accepts a simple 301 and a two-hop redirect", async () => {
    const a = "https://realtrust.ro/a", b = "https://realtrust.ro/b", c = "https://realtrust.ro/c";
    expect((await traceRedirect(a, fakeSite({ [a]: { status: 301, location: "/c" }, [c]: { status: 200, html: article(c) } }))).clean).toBe(true);
    expect((await traceRedirect(a, fakeSite({ [a]: { status: 301, location: b }, [b]: { status: 302, location: c }, [c]: { status: 200, html: article(c) } }))).clean).toBe(true);
  });

  it("flags a chain longer than two hops", async () => {
    const u = (n: number) => `https://realtrust.ro/h${n}`;
    const r = await traceRedirect(u(0), fakeSite({
      [u(0)]: { status: 301, location: u(1) }, [u(1)]: { status: 301, location: u(2) },
      [u(2)]: { status: 301, location: u(3) }, [u(3)]: { status: 200, html: article(u(3)) },
    }));
    expect(r).toMatchObject({ clean: false, problem: "chain", hops: 3 });
  });

  it("flags a redirect loop", async () => {
    const a = "https://realtrust.ro/a", b = "https://realtrust.ro/b";
    const r = await traceRedirect(a, fakeSite({ [a]: { status: 301, location: b }, [b]: { status: 200, html: refreshDoc(a) } }));
    expect(r).toMatchObject({ clean: false, problem: "loop" });
  });

  it("flags a destination answering 404 or 500", async () => {
    expect((await traceRedirect(OLD, fakeSite({ [OLD]: { status: 200, html: refreshDoc(NEW) } }))).problem).toBe("destination_error");
    expect((await traceRedirect(OLD, fakeSite({ [OLD]: { status: 200, html: refreshDoc(NEW) }, [NEW]: { status: 500 } }))).problem).toBe("destination_error");
  });

  it("flags a destination blocked by noindex (meta tag or header)", async () => {
    const meta = `<meta name="robots" content="noindex, follow">`;
    expect((await traceRedirect(OLD, fakeSite({ [OLD]: { status: 200, html: refreshDoc(NEW) }, [NEW]: { status: 200, html: meta } }))).problem).toBe("destination_noindex");
    expect((await traceRedirect(OLD, fakeSite({ [OLD]: { status: 200, html: refreshDoc(NEW) }, [NEW]: { status: 200, html: "", xRobots: "noindex" } }))).problem).toBe("destination_noindex");
  });

  it("flags a destination whose canonical points elsewhere", async () => {
    const r = await traceRedirect(OLD, fakeSite({ [OLD]: { status: 200, html: refreshDoc(NEW) }, [NEW]: { status: 200, html: article("https://realtrust.ro/blog") } }));
    expect(r).toMatchObject({ clean: false, problem: "destination_not_canonical" });
  });

  it("flags an address that no longer redirects at all", async () => {
    const r = await traceRedirect(NEW, fakeSite({ [NEW]: { status: 200, html: article(NEW) } }));
    expect(r).toMatchObject({ clean: false, problem: "no_redirect" });
  });
});

describe("'Page with redirect' in indexing alerts", () => {
  const base = { url: OLD, verdict: "NEUTRAL", coverageState: "Page with redirect" };

  it("is expected (not alerted, not counted as unindexed) only after a clean check", () => {
    expect(classifyInspection({ ...base, redirectCheck: { clean: true } })).toBe("expected_redirect");
    expect(classifyInspection({ ...base, redirectCheck: { clean: false } })).toBe("issue");
    expect(classifyInspection(base)).toBe("issue");
  });

  it("keeps real problems and filter-URL canonicals behaving as before", () => {
    const items = [
      { ...base, redirectCheck: { clean: true } },
      { url: "https://realtrust.ro/anunturi?tranzactie=vanzare", verdict: "NEUTRAL", coverageState: "Alternate page with proper canonical tag" },
      { url: "https://realtrust.ro/blog/timisoara-investitii-imobiliare?lang=en", verdict: "NEUTRAL", coverageState: "Duplicate without user-selected canonical" },
    ];
    expect(realIndexingIssues(items).map((i) => i.url)).toEqual(["https://realtrust.ro/blog/timisoara-investitii-imobiliare?lang=en"]);
  });
});
