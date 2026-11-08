// Approved classic brokerage fees (sales / rentals). Do not change without owner approval.
export const BROKERAGE_FEES = {
  sale: { commission: "2–4%", evaluation: "0 lei" },
  rent: { commission: "50–100%" },
} as const;

export const MANAGEMENT_PACKAGE_COMMISSIONS = { starter: "15%", esential: "18%", standard: "20%" } as const;

export type PricingTab = "administrare" | "intermediere";
export const parsePricingTab = (v: string | null): PricingTab => (v === "intermediere" ? "intermediere" : "administrare");
