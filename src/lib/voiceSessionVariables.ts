/**
 * Dynamic variables sent with every website voice session for Andrei.
 *
 * The ElevenLabs agent is shared with phone calls: its `get_prospect_context`
 * tool requires `callerphone_number`, and the prompt references
 * `agent_memory_context`, `lead_zone`, `lead_price`. If any required variable
 * is missing, ElevenLabs refuses the conversation immediately ("Missing required
 * dynamic variables"), so the visitor hears nothing. Website visitors have no
 * caller number, so we send a non-phone marker that the context webhook treats
 * as an unknown caller.
 */
export const WEB_VISITOR_CALLER_ID = "vizitator-site";

export type VoiceSessionVariables = {
  callerphone_number: string;
  agent_memory_context: string;
  lead_zone: string;
  lead_price: string;
  channel: string;
  page_path: string;
};

export function buildVoiceSessionVariables(opts: { pagePath?: string; language?: string } = {}): VoiceSessionVariables {
  const pagePath = (opts.pagePath || "/").slice(0, 200);
  const isEn = opts.language === "en";
  return {
    callerphone_number: WEB_VISITOR_CALLER_ID,
    agent_memory_context: isEn
      ? `Website visitor (voice from realtrust.ro, page ${pagePath}). No phone number known yet.`
      : `Vizitator pe site (voce de pe realtrust.ro, pagina ${pagePath}). Nu avem încă numărul de telefon.`,
    lead_zone: isEn ? "unknown" : "necunoscută",
    lead_price: isEn ? "unknown" : "necunoscut",
    channel: "website",
    page_path: pagePath,
  };
}

/** True when ElevenLabs closed the session because of an error (not the visitor or the agent). */
export function isVoiceErrorDisconnect(details: unknown): boolean {
  return !!details && typeof details === "object" && (details as { reason?: string }).reason === "error";
}
