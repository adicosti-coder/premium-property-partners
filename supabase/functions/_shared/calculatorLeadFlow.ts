export const CALCULATOR_LEAD_SOURCE_PREFIX = "calculator_unificat";

/** Calculatoarele folosesc exclusiv crm-lead-sync + handle-lead-whatsapp. */
export const isCalculatorLeadSource = (source?: string | null) =>
  typeof source === "string" && source.startsWith(CALCULATOR_LEAD_SOURCE_PREFIX);

/** Alerte generice dezactivate pentru calculatoare: ar omite cifrele și ar dubla mesajul. */
export const shouldSendLegacyLeadAlert = (source?: string | null) =>
  !isCalculatorLeadSource(source);

/** Noile calculatoare folosesc exclusiv Meta direct; Make rămâne pentru fluxul unificat și formularele vechi. */
export const shouldUseMakeWhatsApp = (calculatorKind?: string | null) =>
  !["investment", "guest", "quick_investment"].includes(calculatorKind ?? "");
