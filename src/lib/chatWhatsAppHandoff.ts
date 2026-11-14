/**
 * WhatsApp handoff for the Andrei chat: opens a conversation with the team
 * pre-filled with a short summary of what the visitor discussed on the site.
 *
 * Pure helpers (no DOM) so the summary rules stay testable.
 */

export const ANDREI_WHATSAPP_NUMBER = "40799069256";

/** Max characters of the pre-filled WhatsApp text (wa.me links stay short and readable). */
export const HANDOFF_MAX_CHARS = 900;
/** Max characters kept from a single message in the summary. */
export const HANDOFF_LINE_MAX_CHARS = 160;
/** How many of the most recent messages are summarised. */
export const HANDOFF_MAX_MESSAGES = 6;

export interface HandoffMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
  isStreaming?: boolean;
}

type Lang = "ro" | "en";

/** Strips chat markup (cards, reports, markdown, emoji markers) to one plain line. */
export const plainChatLine = (content: string): string =>
  content
    .replace(/<RAPORT_JSON>[\s\S]*?<\/RAPORT_JSON>/g, " ")
    .replace(/<RT_CARD\s+[^>]*>/gi, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`#>]+/g, "")
    .replace(/^\s*👤\s*Andrei \(RealTrust\):\s*/u, "")
    .replace(/[⚡👇]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

const clip = (text: string, max: number) =>
  text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;

/**
 * Builds the pre-filled WhatsApp text. Without any visitor message it falls
 * back to a neutral opener instead of inventing a summary.
 */
export function buildHandoffText(
  messages: HandoffMessage[],
  { language = "ro", pageUrl }: { language?: Lang; pageUrl?: string } = {},
): string {
  const en = language === "en";
  const usable = messages.filter(
    (m) => !m.isError && !m.isStreaming && !(m.id ?? "").startsWith("greeting") && plainChatLine(m.content),
  );
  const hasVisitorMessage = usable.some((m) => m.role === "user");

  const opener = en
    ? "Hello Andrei! I'm continuing on WhatsApp the conversation I started on realtrust.ro."
    : "Bună ziua, Andrei! Continui pe WhatsApp discuția începută pe realtrust.ro.";
  const footer = pageUrl ? `\n\n${en ? "Page" : "Pagina"}: ${pageUrl}` : "";

  if (!hasVisitorMessage) {
    const fallback = en
      ? "Hello Andrei! I'd like to talk about my property in Timișoara."
      : "Bună ziua, Andrei! Aș dori să discutăm despre proprietatea mea din Timișoara.";
    return clip(`${fallback}${footer}`, HANDOFF_MAX_CHARS);
  }

  const lines = usable.slice(-HANDOFF_MAX_MESSAGES).map((m) => {
    const who = m.role === "user" ? (en ? "Me" : "Eu") : "Andrei";
    return `• ${who}: ${clip(plainChatLine(m.content), HANDOFF_LINE_MAX_CHARS)}`;
  });

  const head = `${opener}\n\n${en ? "Conversation summary" : "Rezumatul discuției"}:\n`;
  // Drop the oldest lines until the whole text fits.
  while (lines.length > 1 && `${head}${lines.join("\n")}${footer}`.length > HANDOFF_MAX_CHARS) lines.shift();
  return clip(`${head}${lines.join("\n")}${footer}`, HANDOFF_MAX_CHARS);
}

export function buildHandoffUrl(
  messages: HandoffMessage[],
  options: { language?: Lang; pageUrl?: string } = {},
): string {
  return `https://wa.me/${ANDREI_WHATSAPP_NUMBER}?text=${encodeURIComponent(buildHandoffText(messages, options))}`;
}
