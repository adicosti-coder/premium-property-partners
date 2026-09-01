/**
 * Conversie EUR → RON pentru afișare și date structurate (schema.org).
 * Cursul este orientativ (BNR ~5.05 RON/EUR) și este folosit doar pentru a
 * afișa prețul și în lei, alături de prețul de referință în euro.
 */
export const EUR_TO_RON = 5.05;

export const eurToRon = (eur: number): number => Math.round(eur * EUR_TO_RON);

/** Ex: "80 € (404 lei)/noapte" */
export const formatDualPricePerNight = (eur: number): string =>
  `${eur} € (${eurToRon(eur).toLocaleString("ro-RO")} lei)/noapte`;
