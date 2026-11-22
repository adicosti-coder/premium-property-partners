import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { clearChatToken, readChatToken, storeChatToken } from "./chatAccess";

beforeAll(() => {
  (globalThis as { Deno?: unknown }).Deno = { env: { get: (k: string) => (k === "SIGNED_TICKET_SECRET" ? "test-secret" : undefined) } };
});

describe("biletul de sesiune pentru chat (browser)", () => {
  afterEach(() => clearChatToken());
  it("se folosește doar până cu un minut înainte de expirare", () => {
    const now = Date.now();
    storeChatToken("t1", now + 10 * 60_000);
    expect(readChatToken(now)).toBe("t1");
    expect(readChatToken(now + 9.5 * 60_000)).toBeNull();
  });
  it("lipsă sau stricat → se cere o verificare nouă", () => {
    expect(readChatToken()).toBeNull();
    sessionStorage.setItem("rt_chat_session_v1", "{nu-e-json");
    expect(readChatToken()).toBeNull();
  });
});

describe("bilete semnate pe server", () => {
  it("valide doar pentru scopul, subiectul și perioada lor", async () => {
    const { issueTicket, verifyTicket } = await import("../../supabase/functions/_shared/signedTicket");
    const chat = await issueTicket("chat-session", 60_000);
    expect(chat).not.toBeNull();
    expect(await verifyTicket("chat-session", chat!.ticket)).toBe(true);
    expect(await verifyTicket("analyzed-listing-pdf", chat!.ticket)).toBe(false);
    const pdf = await issueTicket("analyzed-listing-pdf", 60_000, "row-1");
    expect(await verifyTicket("analyzed-listing-pdf", pdf!.ticket, "row-1")).toBe(true);
    expect(await verifyTicket("analyzed-listing-pdf", pdf!.ticket, "row-2")).toBe(false);
    const [payload] = chat!.ticket.split(".");
    expect(await verifyTicket("chat-session", `${payload}.falsificat`)).toBe(false);
    const expired = await issueTicket("chat-session", -1);
    expect(await verifyTicket("chat-session", expired!.ticket)).toBe(false);
    expect(await verifyTicket("chat-session", undefined)).toBe(false);
  });
});
