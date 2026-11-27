import { describe, expect, it } from "bun:test";
import { bookingTeamEmail, handoffTeamEmail, inspectionTeamEmail } from "./ownerNotificationContent.ts";
describe("notificări operaționale Andrei", () => {
  it("programarea notifică Adrian cu data și ora României, păstrând statusul pending", () => {
    const mail = bookingTeamEmail({ id: "appointment-1", phone: "+40700000000", name: "Client", startsAt: "2026-11-28T08:00:00Z", time: "10:00", listing: "Apartament", conversationId: "conv-1" });
    expect(mail.to).toBe("adicosti@gmail.com");
    expect(mail.subject).toBe("🗓️ Programare nouă Andrei: Client – 28.11.2026 ora 10:00");
    expect(mail.idempotencyKey).toBe("andrei-booking-appointment-1");
    expect(mail.html).toContain("În așteptarea confirmării de către Adrian");
  });
  it("predarea transmite motivul și mesajul fără HTML executabil", () => {
    const mail = handoffTeamEmail({ conversationId: "conv", eventId: "msg", phone: "+40700000000", reason: "Contract", message: '<script>alert(1)</script>' });
    expect(mail.html).toContain("Contract");
    expect(mail.html).toContain("&lt;script&gt;");
    expect(mail.html).not.toContain("<script>");
    expect(mail.idempotencyKey).toBe("andrei-handoff-conv-msg");
  });
  it("acordul include prețul de închiriere și linkul pentru aprobarea exactă", () => {
    const mail = inspectionTeamEmail({ event: "consent", eventId: "c1", prospectId: "p1", inspectionId: "i1", title: "Apartament", price: 430, zone: "Complexul Studențesc", category: "inchiriere", phone: "+40700000000" });
    expect(mail.to).toBe("adicosti@gmail.com");
    expect(mail.html).toContain("430 €/lună");
    expect(mail.html).toContain("inspection=i1#aprobari-recente");
    expect(mail.idempotencyKey).toBe("owner-consent-c1");
  });
  it("inspecția nu depinde de un răspuns WhatsApp și are cheie distinctă", () => {
    const mail = inspectionTeamEmail({ event: "inspection", eventId: "i1", prospectId: "p1", phone: "+40700000000" });
    expect(mail.source).toBe("owner_inspection");
    expect(mail.idempotencyKey).toBe("owner-inspection-i1");
  });
});