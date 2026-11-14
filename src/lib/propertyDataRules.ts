/**
 * Reguli de calitate pentru datele proprietăților — oglindite în triggerul
 * `trg_normalize_property_fields` din baza de date (paritate testată prin constante).
 */

/** Plafon de bun-simț pentru prețul pe noapte; peste el e aproape sigur un preț de vânzare/chirie lunară. */
export const MAX_PRICE_PER_NIGHT_EUR = 1000;
/** Sub acest prag, un preț de vânzare/investiție e o greșeală de import (ex. 11 €, 22 €, 500 €). */
export const MIN_SALE_CAPITAL_EUR = 5000;

// Spații obișnuite, tab/linie nouă, spațiu non-breaking, zero-width și BOM.
const EDGE_WHITESPACE = /^[\s\u00a0\u200b\u200c\u200d\ufeff]+|[\s\u00a0\u200b\u200c\u200d\ufeff]+$/g;

/** Elimină spațiile albe de la început și sfârșit (inclusiv cele invizibile). */
export function cleanPropertyName(name: string | null | undefined): string {
  return (name ?? "").replace(EDGE_WHITESPACE, "");
}

/** Tipurile la care formularul afișează câmpurile de preț pe noapte. */
export function showsNightlyPrice(listingType: string | null | undefined): boolean {
  return listingType === "cazare" || listingType === "investitie";
}

export function isSaleType(listingType: string | null | undefined): boolean {
  return listingType === "vanzare" || listingType === "investitie";
}

export type PriceField = "base_price_per_night" | "weekend_price_per_night" | "capital_necesar";

export interface PriceIssue {
  field: PriceField;
  message: string;
}

export interface PropertyPriceInput {
  listingType: string | null | undefined;
  basePricePerNight?: number | null;
  weekendPricePerNight?: number | null;
  capital?: number | null;
}

const fmt = (n: number) => n.toLocaleString("ro-RO");

/** Probleme care blochează salvarea din formularele de administrare. */
export function validatePropertyPrices(input: PropertyPriceInput): PriceIssue[] {
  const issues: PriceIssue[] = [];
  const nightly: Array<[PriceField, number | null | undefined, string]> = [
    ["base_price_per_night", input.basePricePerNight, "Prețul pe noapte"],
    ["weekend_price_per_night", input.weekendPricePerNight, "Prețul de weekend pe noapte"],
  ];
  if (showsNightlyPrice(input.listingType)) {
    for (const [field, value, label] of nightly) {
      if (value != null && Number.isFinite(value) && value > MAX_PRICE_PER_NIGHT_EUR) {
        issues.push({
          field,
          message: `${label} (${fmt(value)} €) depășește plafonul de ${fmt(MAX_PRICE_PER_NIGHT_EUR)} €/noapte. Pare un preț de vânzare sau o chirie lunară.`,
        });
      }
    }
  }
  const cap = input.capital;
  if (isSaleType(input.listingType) && cap != null && Number.isFinite(cap) && cap > 0 && cap < MIN_SALE_CAPITAL_EUR) {
    issues.push({
      field: "capital_necesar",
      message: `Prețul de vânzare (${fmt(cap)} €) e nerealist de mic. Introdu prețul total în euro (minimum ${fmt(MIN_SALE_CAPITAL_EUR)} €) sau lasă câmpul gol.`,
    });
  }
  return issues;
}

/**
 * Valoare sigură pentru un preț pe noapte ascuns în formular (vânzare/închiriere):
 * importurile vechi au copiat aici prețul de vânzare; peste plafon nu se mai trimite.
 */
export function safeHiddenNightlyPrice(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return value > MAX_PRICE_PER_NIGHT_EUR ? null : value;
}
