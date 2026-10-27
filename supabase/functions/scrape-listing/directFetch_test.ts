import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { cleanListingUrl, parseStructuredHtml } from "./directFetch.ts";

Deno.test("strips Facebook tracking params", () => {
  assertEquals(
    cleanListingUrl("https://realoria.com/p/apartament-2-camere-iosefin?fbclid=IwdGRz&sfnsn=mo"),
    "https://realoria.com/p/apartament-2-camere-iosefin",
  );
});

Deno.test("keeps real query params and unwraps l.facebook.com", () => {
  const wrapped = "https://l.facebook.com/l.php?u=" + encodeURIComponent("https://www.olx.ro/d/oferta/x?id=5&utm_source=fb");
  assertEquals(cleanListingUrl(wrapped), "https://www.olx.ro/d/oferta/x?id=5");
});

Deno.test("reads RealEstateListing JSON-LD and og:image", () => {
  const html = `<meta property="og:image" content="https://cdn/x.jpg"><script type="application/ld+json">
  {"@type":"RealEstateListing","name":"Ap 2 camere","offers":{"price":"76700","priceCurrency":"EUR"},"floorSize":{"value":59}}</script>`;
  const r = parseStructuredHtml(html);
  assertEquals(r.title, "Ap 2 camere");
  assertEquals(r.price, 76700);
  assertEquals(r.currency, "EUR");
  assertEquals(r.size, 59);
  assertEquals(r.images, ["https://cdn/x.jpg"]);
});
