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

/**
 * Make primește formularele vechi (ROI, pre-calculator proprietari); se oprește doar pentru
 * calculatoarele noi, după sursa trimisă sau sursa cererii salvate — nu după existența cifrelor.
 */
export const shouldSkipMakeWebhook = (input: { calculatorKind?: string | null; requestSource?: string | null; storedLeadSource?: string | null }) =>
  !shouldUseMakeWhatsApp(input.calculatorKind)
  || isCalculatorLeadSource(input.requestSource)
  || isCalculatorLeadSource(input.storedLeadSource);
