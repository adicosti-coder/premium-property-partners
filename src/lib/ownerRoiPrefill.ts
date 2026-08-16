/**
 * ownerRoiPrefill — punte între Calculatorul ROI și formularul de contact proprietari.
 * Estimatorul emite un eveniment cu valorile selectate; formularul le preia,
 * pre-completează câmpurile și afișează o notă de context.
 */

export const OWNER_ROI_PREFILL_EVENT = "owner-roi-prefill";
export const OWNER_CONTACT_ANCHOR_ID = "contact-proprietari";

export interface OwnerRoiPrefillPayload {
  /** Cheia tipului de proprietate (garsoniera | 2-camere | 3-camere) */
  propertyType: string;
  /** Cheia zonei/proiectului (isho | city-of-mara | circumvalatiunii | centru) */
  zone: string;
  /** Chiria clasică lunară selectată în calculator (EUR) */
  monthlyRent: number;
  /** Venit net anual estimat în regim hotelier (EUR) */
  netAnnualIncome: number;
}

export const emitOwnerRoiPrefill = (payload: OwnerRoiPrefillPayload) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<OwnerRoiPrefillPayload>(OWNER_ROI_PREFILL_EVENT, { detail: payload }),
  );
};

export const scrollToOwnerContactForm = () => {
  if (typeof document === "undefined") return false;
  const target = document.getElementById(OWNER_CONTACT_ANCHOR_ID);
  if (!target) return false;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
  return true;
};
