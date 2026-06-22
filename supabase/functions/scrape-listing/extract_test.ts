import {
  assert,
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

import {
  computeBackoffDelay,
  fetchWithRetry,
  inferGeoCode,
  scrapeWithScrapeDo,
} from "./extract.ts";

// Deterministic RNG → always returns 0.5 so jitter = floor(0.5 * jitterMs).
const rand = () => 0.5;

Deno.test("inferGeoCode: maps TLDs to expected proxy country", () => {
  assertEquals(inferGeoCode("https://www.olx.ro/d/oferta/123"), "ro");
  assertEquals(inferGeoCode("https://example.hu/listing"), "hu");
  assertEquals(inferGeoCode("https://immo.de/x"), "de");
  assertEquals(inferGeoCode("https://immo.at/x"), "de");
  assertEquals(inferGeoCode("https://casa.it/x"), "it");
  assertEquals(inferGeoCode("https://immo.fr/x"), "fr");
  assertEquals(inferGeoCode("https://piso.es/x"), "es");
  assertEquals(inferGeoCode("https://site.co.uk/x"), "gb");
  assertEquals(inferGeoCode("https://site.uk/x"), "gb");
  assertEquals(inferGeoCode("https://airbnb.com/rooms/1"), "us");
  assertEquals(inferGeoCode("https://foo.net/x"), "us");
  assertEquals(inferGeoCode("https://unknown.xyz/x"), "ro"); // fallback
  assertEquals(inferGeoCode("not a url"), "ro");             // parse failure fallback
});


Deno.test("computeBackoffDelay: exponential 500/1000/2000/4000 + jitter", () => {
  assertEquals(computeBackoffDelay(1, { rand }), 500 + 125);
  assertEquals(computeBackoffDelay(2, { rand }), 1000 + 125);
  assertEquals(computeBackoffDelay(3, { rand }), 2000 + 125);
  assertEquals(computeBackoffDelay(4, { rand }), 4000 + 125);
});

Deno.test("computeBackoffDelay: respects cap", () => {
  const d = computeBackoffDelay(10, { rand, capMs: 8000 });
  // 500 * 2^9 = 256000 → capped at 8000 + jitter(125) = 8125
  assertEquals(d, 8125);
});

Deno.test("computeBackoffDelay: jitter component is added correctly", () => {
  // rand=0 → no jitter; rand=0.999 → ~jitterMs-1
  assertEquals(computeBackoffDelay(1, { rand: () => 0, jitterMs: 300 }), 500);
  assertEquals(
    computeBackoffDelay(1, { rand: () => 0.999, jitterMs: 300 }),
    500 + Math.floor(0.999 * 300),
  );
});

Deno.test("fetchWithRetry: retries on 429 then succeeds", async () => {
  let calls = 0;
  const slept: number[] = [];
  const fakeFetch = (() =>
    new Response("ok", {
      status: ++calls < 3 ? 429 : 200,
    })) as unknown as typeof fetch;

  const result = await fetchWithRetry("https://x", { method: "GET" }, {
    fetchFn: fakeFetch,
    sleepFn: async (ms) => { slept.push(ms); },
    rand,
  });

  assertEquals(result.attempts, 3);
  assertEquals(result.response.status, 200);
  assertEquals(slept, [500 + 125, 1000 + 125]);
  await result.response.text();
});

Deno.test("fetchWithRetry: retries on 5xx then succeeds", async () => {
  let calls = 0;
  const codes = [500, 503, 200];
  const slept: number[] = [];
  const fakeFetch = (() =>
    new Response("body", { status: codes[calls++] })) as unknown as typeof fetch;

  const result = await fetchWithRetry("https://x", { method: "GET" }, {
    fetchFn: fakeFetch,
    sleepFn: async (ms) => { slept.push(ms); },
    rand,
  });
  assertEquals(result.attempts, 3);
  assertEquals(result.response.status, 200);
  assertEquals(slept.length, 2);
  await result.response.text();
});

Deno.test("fetchWithRetry: stops after maxAttempts and returns last response", async () => {
  let calls = 0;
  const slept: number[] = [];
  const fakeFetch = (() => {
    calls++;
    return new Response("rate", { status: 429 });
  }) as unknown as typeof fetch;

  const result = await fetchWithRetry("https://x", { method: "GET" }, {
    fetchFn: fakeFetch,
    sleepFn: async (ms) => { slept.push(ms); },
    rand,
    maxAttempts: 4,
  });
  assertEquals(result.attempts, 4);
  assertEquals(result.response.status, 429);
  // 3 backoff waits between 4 attempts
  assertEquals(slept, [500 + 125, 1000 + 125, 2000 + 125]);
  await result.response.text();
});

Deno.test("fetchWithRetry: does NOT retry 4xx (except 429)", async () => {
  let calls = 0;
  const fakeFetch = (() => {
    calls++;
    return new Response("nope", { status: 403 });
  }) as unknown as typeof fetch;

  const result = await fetchWithRetry("https://x", { method: "GET" }, {
    fetchFn: fakeFetch,
    sleepFn: async () => {},
    rand,
  });
  assertEquals(calls, 1);
  assertEquals(result.attempts, 1);
  await result.response.text();
});

Deno.test("fetchWithRetry: retries network errors then throws", async () => {
  let calls = 0;
  const slept: number[] = [];
  const fakeFetch = (() => {
    calls++;
    throw new Error("network down");
  }) as unknown as typeof fetch;

  await assertRejects(
    () =>
      fetchWithRetry("https://x", { method: "GET" }, {
        fetchFn: fakeFetch,
        sleepFn: async (ms) => { slept.push(ms); },
        rand,
        maxAttempts: 3,
      }),
    Error,
    "network down",
  );
  assertEquals(calls, 3);
  assertEquals(slept.length, 2);
});

Deno.test("scrapeWithScrapeDo: collects logs across retries and returns attempts", async () => {
  let calls = 0;
  const fakeFetch = (() => {
    calls++;
    if (calls < 2) return new Response("rate", { status: 429 });
    return new Response("<html><body><h1>Hi</h1></body></html>", { status: 200 });
  }) as unknown as typeof fetch;

  const result = await scrapeWithScrapeDo("https://example.com/listing", "test-key", {
    fetchFn: fakeFetch,
    sleepFn: async () => {},
    rand,
  });

  assertEquals(result.attempts, 2);
  assert(result.markdown.includes("Hi"));
  assert(result.logs.some((l) => l.includes("Transient HTTP 429")));
});

Deno.test("scrapeWithScrapeDo: 401 throws with firecrawl_status + logs", async () => {
  const fakeFetch = (() =>
    new Response("invalid token", { status: 401 })) as unknown as typeof fetch;

  const err = await assertRejects(
    () =>
      scrapeWithScrapeDo("https://example.com/listing", "bad", {
        fetchFn: fakeFetch,
        sleepFn: async () => {},
        rand,
      }),
    Error,
    "Scrape.do",
  );
  // deno-lint-ignore no-explicit-any
  const e = err as any;
  assertEquals(e.firecrawl_status, 401);
  assert(Array.isArray(e.logs) && e.logs.length > 0);
});

Deno.test("scrapeWithScrapeDo: integration — encodes URL + forwards advanced params", async () => {
  let capturedUrl = "";
  let capturedHeaders: HeadersInit | undefined;
  const fakeFetch = ((u: string, init?: RequestInit) => {
    capturedUrl = u;
    capturedHeaders = init?.headers;
    return new Response("<html><body><h1>OK</h1></body></html>", { status: 200 });
  }) as unknown as typeof fetch;

  const targetUrl = "https://www.publi24.ro/anunturi/imobiliare/listing?id=42&ref=a b";
  const result = await scrapeWithScrapeDo(targetUrl, "tkn-123", {
    fetchFn: fakeFetch,
    sleepFn: async () => {},
    rand,
    waitSelector: ".gallery img",
    customWait: 7500,
    geoCode: "RO",
  });

  assertEquals(result.attempts, 1);
  // Endpoint must be the scrape.do API with strictly-encoded params.
  assert(capturedUrl.startsWith("https://api.scrape.do/?"));
  const qs = new URLSearchParams(capturedUrl.split("?")[1]);
  assertEquals(qs.get("token"), "tkn-123");
  assertEquals(qs.get("url"), targetUrl); // URLSearchParams round-trips decoded
  assertEquals(qs.get("render"), "true");
  assertEquals(qs.get("super"), "true");
  assertEquals(qs.get("geoCode"), "ro"); // lowercased
  assertEquals(qs.get("waitUntil"), "networkidle0");
  assertEquals(qs.get("customWait"), "7500");
  assertEquals(qs.get("waitSelector"), ".gallery img");
  assertEquals(qs.get("blockResources"), "false");
  assertEquals(qs.get("device"), "desktop");
  assertEquals(qs.get("customHeaders"), "true");
  // The space character must be percent-encoded in the raw endpoint string.
  assert(capturedUrl.includes("ref%3Da%20b") || capturedUrl.includes("ref%3Da+b"));
  // Default UA + accept-language headers forwarded.
  assert(capturedHeaders && (capturedHeaders as Record<string, string>)["User-Agent"]?.includes("Chrome"));

  // Request logging captures both params and redacted endpoint.
  assert(result.logs.some((l) => l.includes("Request params") && l.includes("waitSelector")));
  assert(result.logs.some((l) => l.includes("Encoded endpoint") && l.includes("token=***")));
  assert(result.logs.some((l) => l.includes("Forwarded headers")));
});
