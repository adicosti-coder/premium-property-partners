import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { safePublicFetch } from "../../supabase/functions/_shared/ssrfGuard";

const blockPrivate = async (raw: string) => {
  const u = new URL(raw);
  if (/^(127\.|10\.|169\.254\.|192\.168\.)|localhost/.test(u.hostname)) throw new Error("URL not allowed");
  return u;
};

describe("listing import address guard", () => {
  it("refuses a public page that redirects to an internal address", async () => {
    const fetchImpl = (async (url: string) =>
      url.startsWith("https://agentie.ro")
        ? new Response(null, { status: 302, headers: { location: "http://169.254.169.254/latest" } })
        : new Response("secret")) as unknown as typeof fetch;
    await expect(
      safePublicFetch("https://agentie.ro/anunt", {}, { fetchImpl, validate: blockPrivate }),
    ).rejects.toThrow("URL not allowed");
  });

  it("follows redirects between public pages", async () => {
    const fetchImpl = (async (url: string) =>
      url === "https://agentie.ro/a"
        ? new Response(null, { status: 301, headers: { location: "/b" } })
        : new Response("ok", { status: 200 })) as unknown as typeof fetch;
    const r = await safePublicFetch("https://agentie.ro/a", {}, { fetchImpl, validate: blockPrivate });
    expect(await r.text()).toBe("ok");
  });

  it("stops after 5 redirects", async () => {
    const fetchImpl = (async () =>
      new Response(null, { status: 302, headers: { location: "/loop" } })) as unknown as typeof fetch;
    await expect(
      safePublicFetch("https://agentie.ro/loop", {}, { fetchImpl, validate: blockPrivate }),
    ).rejects.toThrow("Too many redirects");
  });
});

describe("SEO A/B counters", () => {
  it("can only be incremented by internal or admin callers", () => {
    const src = readFileSync(resolve(__dirname, "../../supabase/functions/seo-track-impression/index.ts"), "utf8");
    expect(src).toMatch(/requireInternalOrAdmin\(req, corsHeaders\)/);
  });
});
