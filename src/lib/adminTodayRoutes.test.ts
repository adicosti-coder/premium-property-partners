import { describe, expect, it } from "vitest";
import { TODAY_ROUTES, prospectDetailRoute, samePhone, whatsappChatRoute } from "./adminTodayRoutes";

describe("scurtături Astăzi", () => {
  it("„De verificat” deschide Pasul 2 (Verifică)", () => {
    expect(TODAY_ROUTES.verify).toBe("/admin/flux-proprietari?step=verify");
  });
  it("„Fără WhatsApp” deschide lista „Apeluri de făcut” din pipeline-ul unificat", () => {
    expect(TODAY_ROUTES.noWhatsApp).toBe("/admin/unified-pipeline?section=prospects&subtab=calls");
  });
  it("coada WhatsApp și jurnalul apelurilor lui Andrei au scurtături directe", () => {
    expect(TODAY_ROUTES.whatsappQueue).toBe("/admin/whatsapp-queue");
    expect(TODAY_ROUTES.callLog).toBe("/admin/call-dashboard");
  });
  it("răspunsul unui proprietar deschide chatul cu numărul lui", () => {
    expect(whatsappChatRoute("+40712345678")).toBe("/admin/whatsapp-chat?phone=%2B40712345678");
    expect(whatsappChatRoute(null)).toBe("/admin/whatsapp-chat");
  });
  it("un scor ≥70 deschide fișa anunțului", () => {
    expect(prospectDetailRoute("abc-1")).toBe("/admin/anunt-proprietar/abc-1");
  });
  it("același număr se potrivește indiferent de prefix", () => {
    expect(samePhone("+40712345678", "0712 345 678")).toBe(true);
    expect(samePhone("0040712345678", "40712345678")).toBe(true);
    expect(samePhone("+40712345678", "+40712345679")).toBe(false);
    expect(samePhone("", "")).toBe(false);
  });
});
