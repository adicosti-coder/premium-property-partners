// Auto-reply rules for widget leads: first WhatsApp confirmation + qualification
// message sent through Make.com once a widget lead is validated and scored Warm+.

export const AUTO_REPLY_MIN_SCORE = 60;

export function shouldAutoReply(input: {
  source?: string | null;
  score: number;
  phone: string | null;
  reEngaged: boolean;
}): boolean {
  return (
    (input.source ?? "").startsWith("lead_engagement_widget") &&
    input.score >= AUTO_REPLY_MIN_SCORE &&
    !!input.phone &&
    !input.reEngaged
  );
}

export function buildAutoReplyMessage(name: string | null | undefined, intent: string | null): string {
  const first = (name ?? "").trim().split(/\s+/)[0];
  const hello = first ? `Bună ziua, ${first}!` : "Bună ziua!";
  const isHotel = /administrare|hotelier/i.test(intent ?? "");
  const topic = isHotel
    ? "administrarea apartamentului în regim hotelier"
    : "simularea de randament pentru apartamentul dumneavoastră";
  return [
    `${hello} Vă mulțumim pentru cererea trimisă pe realtrust.ro. Am primit-o și ne ocupăm de ${topic}.`,
    "",
    "Ca să vă răspundem precis, scrieți-ne pe scurt:",
    "• În ce zonă din Timișoara este apartamentul?",
    "• Câte camere are și ce suprafață utilă (m²)?",
    "• Este mobilat și liber acum sau închiriat?",
    "",
    "Revenim aici pe WhatsApp cu o estimare. Dacă nu doriți mesaje, răspundeți NU.",
  ].join("\n");
}
