import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { checkTranslationField, checkAgencyClassification } from "./liteOutputChecks.ts";

Deno.test("good translation passes", () => {
  assertEquals(checkTranslationField("Apartament 2 camere, 65 mp, 95.000 €", "2-room apartment, 65 sqm, €95,000", "title"), []);
});
Deno.test("untranslated Romanian is flagged", () => {
  const ro = "Această garsonieră este pentru investitori și care caută randament în Timișoara";
  assert(checkTranslationField(ro, ro + " ok", "excerpt").some((i) => i.includes("română")));
});
Deno.test("dropped number is flagged", () => {
  assert(checkTranslationField("Randament 9,4% la 65 mp", "Yield at sqm", "t").some((i) => i.includes("cifre")));
});
Deno.test("empty translation is flagged", () => {
  assertEquals(checkTranslationField("Titlu", "", "title").length, 1);
});
Deno.test("high agency score without signals is flagged", () => {
  const r = checkAgencyClassification({ title: "Apartament 2 camere Iosefin" }, { score: 90, reason: "pare generic" }, 80);
  assert(r.length > 0);
});
Deno.test("agency score with agency signal passes", () => {
  assertEquals(checkAgencyClassification({ title: "Agenția X vinde, comision 2%" }, { score: 92, reason: "nume agenție" }, 80), []);
});
Deno.test("low score despite agency text is flagged", () => {
  assert(checkAgencyClassification({ description: "Agentie imobiliara, comision 3%" }, { score: 5, reason: "privat" }, 80).length > 0);
});
Deno.test("unknown id is flagged", () => {
  assertEquals(checkAgencyClassification(undefined, { score: 50, reason: "x" }, 80), ["id necunoscut în lot"]);
});
