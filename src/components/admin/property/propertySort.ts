/**
 * Sortare pentru tabelul admin de proprietăți — aplicată pe server
 * (ORDER BY în query), nu în browser.
 */
export type PropertySortColumn =
  | "updated_at"
  | "created_at"
  | "name"
  | "capital_necesar"
  | "base_price_per_night"
  | "display_order";

export interface PropertySort {
  column: PropertySortColumn;
  ascending: boolean;
}

export const DEFAULT_PROPERTY_SORT: PropertySort = { column: "updated_at", ascending: false };

export interface PropertySortOption {
  key: string;
  label: string;
  sort: PropertySort;
}

export const PROPERTY_SORT_OPTIONS: PropertySortOption[] = [
  { key: "updated_desc", label: "Cele mai recente (actualizare)", sort: DEFAULT_PROPERTY_SORT },
  { key: "name_asc", label: "Nume (A → Z)", sort: { column: "name", ascending: true } },
  { key: "name_desc", label: "Nume (Z → A)", sort: { column: "name", ascending: false } },
  { key: "capital_asc", label: "Capital / Preț vânzare (crescător)", sort: { column: "capital_necesar", ascending: true } },
  { key: "capital_desc", label: "Capital / Preț vânzare (descrescător)", sort: { column: "capital_necesar", ascending: false } },
  { key: "price_asc", label: "Preț / noapte (crescător)", sort: { column: "base_price_per_night", ascending: true } },
  { key: "price_desc", label: "Preț / noapte (descrescător)", sort: { column: "base_price_per_night", ascending: false } },
  { key: "order_asc", label: "Ordinea afișării", sort: { column: "display_order", ascending: true } },
  { key: "created_desc", label: "Data adăugării (cele mai noi)", sort: { column: "created_at", ascending: false } },
];

export function sortToKey(sort: PropertySort): string {
  const match = PROPERTY_SORT_OPTIONS.find(
    (o) => o.sort.column === sort.column && o.sort.ascending === sort.ascending,
  );
  return match?.key ?? PROPERTY_SORT_OPTIONS[0].key;
}

export function keyToSort(key: string | null | undefined): PropertySort {
  return PROPERTY_SORT_OPTIONS.find((o) => o.key === key)?.sort ?? DEFAULT_PROPERTY_SORT;
}

/** Prima apăsare pe o coloană: text/ordine → crescător, cifre/date → descrescător. */
const FIRST_CLICK_ASCENDING: Record<PropertySortColumn, boolean> = {
  name: true,
  display_order: true,
  capital_necesar: false,
  base_price_per_night: false,
  updated_at: false,
  created_at: false,
};

/** Clic pe capul de coloană: coloană nouă → direcția implicită, aceeași coloană → inversează. */
export function toggleColumnSort(current: PropertySort, column: PropertySortColumn): PropertySort {
  if (current.column === column) return { column, ascending: !current.ascending };
  return { column, ascending: FIRST_CLICK_ASCENDING[column] };
}

/** Valorile lipsă (fără preț/capital) ajung mereu la final, în ambele direcții. */
export function sortToServerOrder(sort: PropertySort) {
  return { column: sort.column, ascending: sort.ascending, nullsFirst: false, tiebreaker: "id" };
}
