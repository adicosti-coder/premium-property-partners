/**
 * Makes lead messages readable in Admin: strips technical "[source]" prefixes
 * and turns legacy "a · b · c" evaluation messages into bullet lines.
 */
export function formatLeadMessage(raw: string | null | undefined): string {
  if (!raw) return "";
  let msg = raw.replace(/^\s*\[[a-z0-9_]+\]\s*/i, "");
  if (msg.includes(" · ") && !msg.includes("\n")) {
    msg = msg
      .split(" · ")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const m = p.match(/^(\d+)\s*mp$/i);
        if (m) return `Suprafață: ${m[1]} m²`;
        return p.replace(/^Estimare auto:/i, "Estimare:").replace(/(\d)-(\d)/, "$1 – $2");
      })
      .map((p) => `• ${p}`)
      .join("\n");
  }
  return msg;
}

/** Extracts surface from legacy evaluation messages ("55 mp" / "Suprafață: 55 m²"). */
export function areaFromMessage(raw: string | null | undefined): number {
  const m = raw?.match(/(\d{2,4})\s*(?:mp|m²)/i);
  return m ? parseInt(m[1], 10) : 0;
}
