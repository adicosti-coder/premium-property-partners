import { expect, test } from "bun:test";
import { autoReplyText, clientViewingStepReply, type ConversationMessage } from "./waAutoReply.ts";

const outbound = (kind: string, content = "întrebare"): ConversationMessage => ({
  direction: "outbound",
  content,
  tool_call: { auto_reply: kind },
});
const inbound = (content: string): ConversationMessage => ({ direction: "inbound", content });

test("pornește vizionarea clientului cerând doar zona", () => {
  expect(autoReplyText("Când pot veni la vizionare?", null)).toEqual({
    kind: "client_viewing_ask_zone",
    text: "Sigur, vă ajut cu vizionarea. În ce zonă căutați?",
  });
});

test("continuă vizionarea în ordinea zonă, camere, zi, oră", () => {
  const messages: ConversationMessage[] = [outbound("client_viewing_ask_zone"), inbound("Iosefin")];
  expect(clientViewingStepReply(messages)?.kind).toBe("client_viewing_ask_rooms");
  messages.push(outbound("client_viewing_ask_rooms"), inbound("2 camere"));
  expect(clientViewingStepReply(messages)?.kind).toBe("client_viewing_ask_day");
  messages.push(outbound("client_viewing_ask_day"), inbound("Joi"));
  expect(clientViewingStepReply(messages)?.kind).toBe("client_viewing_ask_time");
  messages.push(outbound("client_viewing_ask_time"), inbound("17:30"));
  expect(clientViewingStepReply(messages)).toEqual({
    kind: "client_viewing_confirmed",
    text: "Perfect, am notat: Iosefin · 2 camere · Joi · 17:30. Un coleg RealTrust confirmă vizionarea aici.",
  });
});

test("nu preia conversațiile care nu sunt în fluxul de vizionare client", () => {
  expect(clientViewingStepReply([outbound("owner_viewing"), inbound("Mâine")])).toBeNull();
});