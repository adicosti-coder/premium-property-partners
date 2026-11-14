import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROPERTY_SORT,
  keyToSort,
  sortToKey,
  sortToServerOrder,
  toggleColumnSort,
} from "./propertySort";

describe("propertySort", () => {
  it("implicit: cele mai recente după data actualizării, descrescător", () => {
    expect(DEFAULT_PROPERTY_SORT).toEqual({ column: "updated_at", ascending: false });
    expect(keyToSort(null)).toEqual({ column: "updated_at", ascending: false });
    expect(keyToSort("necunoscut")).toEqual({ column: "updated_at", ascending: false });
  });

  it("opțiunile din meniu corespund coloanelor din baza de date", () => {
    expect(keyToSort("name_desc")).toEqual({ column: "name", ascending: false });
    expect(keyToSort("capital_asc")).toEqual({ column: "capital_necesar", ascending: true });
    expect(keyToSort("price_desc")).toEqual({ column: "base_price_per_night", ascending: false });
    expect(keyToSort("order_asc")).toEqual({ column: "display_order", ascending: true });
    expect(keyToSort("created_desc")).toEqual({ column: "created_at", ascending: false });
    expect(sortToKey({ column: "name", ascending: true })).toBe("name_asc");
  });

  it("clic pe aceeași coloană inversează direcția", () => {
    const first = toggleColumnSort(DEFAULT_PROPERTY_SORT, "name");
    expect(first).toEqual({ column: "name", ascending: true });
    expect(toggleColumnSort(first, "name")).toEqual({ column: "name", ascending: false });
    expect(toggleColumnSort(DEFAULT_PROPERTY_SORT, "capital_necesar")).toEqual({
      column: "capital_necesar",
      ascending: false,
    });
  });

  it("proprietățile fără preț ajung la final și ordinea e stabilă între pagini", () => {
    const order = sortToServerOrder({ column: "base_price_per_night", ascending: false });
    expect(order.nullsFirst).toBe(false);
    expect(order.tiebreaker).toBe("id");
  });
});
