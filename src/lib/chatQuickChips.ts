/**
 * Quick-start chips shown when Andrei's chat window opens.
 * kind "send" posts the label as a chat message, "voice" starts the
 * ElevenLabs WebRTC voice session, "whatsapp" opens the WhatsApp handoff.
 */
export type QuickChipKind = "send" | "voice" | "whatsapp";
export type QuickChip = { label: string; kind: QuickChipKind };

export const QUICK_CHIPS: Record<"ro" | "en", QuickChip[]> = {
  ro: [
    { label: "🎙️ Vorbește vocal cu Andrei", kind: "voice" },
    { label: "📊 Calculează randamentul apartamentului meu", kind: "send" },
    { label: "🔑 Cum funcționează regimul hotelier (comision 15–20%)", kind: "send" },
    { label: "🏡 Vreau o evaluare gratuită pentru vânzare/chirie", kind: "send" },
    { label: "💬 Continuă direct pe WhatsApp cu Andrei", kind: "whatsapp" },
  ],
  en: [
    { label: "🎙️ Talk to Andrei by voice", kind: "voice" },
    { label: "📊 Calculate my apartment's yield", kind: "send" },
    { label: "🔑 How short-term rental management works (15–20% commission)", kind: "send" },
    { label: "🏡 I want a free valuation for sale/rent", kind: "send" },
    { label: "💬 Continue on WhatsApp with Andrei", kind: "whatsapp" },
  ],
};
