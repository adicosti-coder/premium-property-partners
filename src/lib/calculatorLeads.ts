export type AdditionalCalculatorKind = "investment" | "guest" | "quick_investment";

export interface CalculatorLeadRequest {
  kind: AdditionalCalculatorKind;
  source: string;
  tag: "[Lead Investitor]" | "[Lead Oaspete]" | "[Lead Rapid Investiții]";
  calculatorName: string;
  location: string;
  propertyType: string;
  adminSummary: string;
  visitorSummary: string;
  visitorNextStep: string;
  data: Record<string, string | number | boolean | null>;
}

const eur = (value: number) => `${Math.round(value).toLocaleString("ro-RO")} €`;

export function buildInvestmentLeadRequest(input: {
  purchasePrice: number;
  renovation: number;
  netYieldPct: number;
  annualNet: number;
  estimatedRent: number;
}): CalculatorLeadRequest {
  const profit10Years = input.annualNet * 10;
  const summary = [
    `Preț achiziție: ${eur(input.purchasePrice)}`,
    `Mobilare/renovare: ${eur(input.renovation)}`,
    `Randament net: ${input.netYieldPct.toFixed(2)}%`,
    `Profit la 10 ani: ${eur(profit10Years)}`,
    `Chirie estimată: ${eur(input.estimatedRent)}/lună`,
  ].join(" • ");
  return {
    kind: "investment",
    source: "calculator_unificat_investitii",
    tag: "[Lead Investitor]",
    calculatorName: "Calculator Investiții — Randament la Cumpărare",
    location: "Timișoara",
    propertyType: "investitie",
    adminSummary: summary,
    visitorSummary: summary,
    visitorNextStep: "Andrei verifică ipotezele și vă scrie cu analiza financiară detaliată. Cifrele sunt estimări, nu o garanție de venit.",
    data: {
      purchase_price: Math.round(input.purchasePrice),
      renovation_cost: Math.round(input.renovation),
      net_yield_pct: Number(input.netYieldPct.toFixed(2)),
      annual_net: Math.round(input.annualNet),
      profit_10y: Math.round(profit10Years),
      estimated_rent: Math.round(input.estimatedRent),
    },
  };
}

export function buildGuestLeadRequest(input: {
  propertyName: string;
  nights: number;
  guests: number;
  directTotal: number;
  bookingTotal: number;
}): CalculatorLeadRequest {
  const summary = [
    `Apartament: ${input.propertyName}`,
    `Sejur: ${input.nights} ${input.nights === 1 ? "noapte" : "nopți"}`,
    `Oaspeți: ${input.guests}`,
    `Total direct (DIRECT5): ${eur(input.directTotal)}`,
    `Booking.com: ${eur(input.bookingTotal)}`,
  ].join(" • ");
  return {
    kind: "guest",
    source: "calculator_unificat_oaspeti",
    tag: "[Lead Oaspete]",
    calculatorName: "Calculator Oaspeți — Preț Cazare",
    location: "Timișoara",
    propertyType: "cazare",
    adminSummary: summary,
    visitorSummary: summary,
    visitorNextStep: "Andrei verifică disponibilitatea și confirmă oferta aici pe WhatsApp. Rezervarea nu este finalizată automat.",
    data: {
      property_name: input.propertyName,
      nights: input.nights,
      guests: input.guests,
      direct_total: Math.round(input.directTotal),
      booking_total: Math.round(input.bookingTotal),
      discount_code: "DIRECT5",
    },
  };
}

export function buildQuickInvestmentLeadRequest(input: {
  purchasePrice: number;
  renovation: number;
  monthlyRent: number;
  monthsRented: number;
  annualNet: number;
  netYieldPct: number;
}): CalculatorLeadRequest {
  const summary = [
    `Preț achiziție: ${eur(input.purchasePrice)}`,
    `Mobilare/renovare: ${eur(input.renovation)}`,
    `Chirie lunară: ${eur(input.monthlyRent)}`,
    `Luni închiriate: ${input.monthsRented}`,
    `Venit net anual: ${eur(input.annualNet)}`,
    `Randament net: ${input.netYieldPct.toFixed(2)}%`,
  ].join(" • ");
  return {
    kind: "quick_investment",
    source: "calculator_unificat_rapid_investitii",
    tag: "[Lead Rapid Investiții]",
    calculatorName: "Widget Compact Investitori",
    location: "Timișoara",
    propertyType: "investitie",
    adminSummary: summary,
    visitorSummary: summary,
    visitorNextStep: "Andrei verifică cifrele introduse și vă contactează pentru analiza completă.",
    data: {
      purchase_price: Math.round(input.purchasePrice),
      renovation_cost: Math.round(input.renovation),
      monthly_rent: Math.round(input.monthlyRent),
      months_rented: input.monthsRented,
      annual_net: Math.round(input.annualNet),
      net_yield_pct: Number(input.netYieldPct.toFixed(2)),
      profit_10y: Math.round(input.annualNet * 10),
    },
  };
}
