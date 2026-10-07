import { expect, test } from "bun:test";
import {
  autoReplyText,
  clientPreparedReply,
  clientViewingStepReply,
  rememberedClientZone,
  type ConversationMessage,
} from "./waAutoReply.ts";

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
  expect(clientViewingStepReply(messages)).toMatchObject({
    kind: "client_viewing_confirmed",
  });
  expect(clientViewingStepReply(messages)?.text).toContain("Iosefin · 2 camere · Joi · 17:30");
});

test("nu preia conversațiile care nu sunt în fluxul de vizionare client", () => {
  expect(clientViewingStepReply([outbound("owner_viewing"), inbound("Mâine")])).toBeNull();
});

test("STOP rămâne disponibil în timpul oricărui flux", () => {
  expect(autoReplyText("STOP", null)?.kind).toBe("quick_stop");
});

test("reține zona și nu o cere din nou la o nouă intenție", () => {
  const messages: ConversationMessage[] = [
    outbound("client_viewing_ask_zone"),
    inbound("Iosefin"),
    outbound("client_viewing_confirmed", "Am notat zona."),
  ];
  expect(rememberedClientZone(messages)).toBe("Iosefin");
  expect(clientPreparedReply("Cât este chiria?", messages)).toEqual({
    kind: "client_rent_ask_rooms",
    text: "Perfect, am păstrat zona Iosefin. Câte camere vi s-ar potrivi?",
  });
});

test("pregătește răspunsuri empatice pentru preț, chirie și venit hotelier", () => {
  expect(clientPreparedReply("Care este prețul?", [])?.kind).toBe("client_price_ask_zone");
  expect(clientPreparedReply("Caut chirie", [])?.kind).toBe("client_rent_ask_zone");
  expect(clientPreparedReply("Ce venit hotelier pot obține?", [])?.kind).toBe("client_hotel_income_ask_zone");
});
test("apel cerut de client: subiect, apoi interval", () => {
  expect(clientPreparedReply("Mă puteți suna?", [])?.kind).toBe("client_call_ask_topic");
  expect(clientPreparedReply("comision", [outbound("client_call_ask_topic")])?.kind).toBe("client_call_fee");
  expect(clientPreparedReply("preț", [outbound("client_call_ask_topic")])?.kind).toBe("client_call_price");
});

// ── Detectarea intervalului de apel: fără alerte false ──
import { looksLikeCallInterval } from "./waAutoReply.ts";

test.each([
  "După prânz", "dimineața", "mâine", "Joi", "azi seara", "17:00", "la 5", "între 10 și 12", "17h", "oricând", "acum",
])("recunoaște intervalul de apel: %s", (txt) => {
  expect(looksLikeCallInterval(txt)).toBe(true);
});

test.each([
  "De ce nu ajung anunțurile?", "Când mă sunați?", "Mâine?", "La ce oră?", "ok", "Mulțumesc", "2 camere",
  "comision", "Sunt în oraș", "Da", "Vreau mai multe detalii", "",
])("NU ia drept interval: %s", (txt) => {
  expect(looksLikeCallInterval(txt)).toBe(false);
});

test("o întrebare după cererea de apel nu declanșează alerta", () => {
  const msgs: ConversationMessage[] = [outbound("client_call_fee"), inbound("De ce nu ajung anunțurile?")];
  expect(clientPreparedReply("De ce nu ajung anunțurile?", msgs)?.kind).not.toBe("client_call_noted");
  const msgs2: ConversationMessage[] = [outbound("client_call_time"), inbound("ok")];
  expect(clientPreparedReply("ok", msgs2)?.kind).not.toBe("client_call_noted");
});

test("un interval real după cererea de apel este notat", () => {
  const msgs: ConversationMessage[] = [outbound("client_call_fee"), inbound("după prânz")];
  expect(clientPreparedReply("după prânz", msgs)?.kind).toBe("client_call_noted");
});
