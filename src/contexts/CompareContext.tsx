import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

/**
 * Unified comparable item – works for both static MockListings
 * and real DB properties (NeighborhoodProperty).
 */
export interface ComparableItem {
  id: string;
  title: string;
  price: number;
  pricePerSqm: number;
  rooms: number;
  floor: number | string;
  surface: number;
  badge: "administrare" | "vanzare" | "investitie";
  imageAlt: string;
  slug?: string | null;
  roi?: string | null;
  estimatedRevenue?: string | null;
}

interface CompareContextType {
  items: ComparableItem[];
  add: (item: ComparableItem) => void;
  remove: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
}

const CompareContext = createContext<CompareContextType | null>(null);

export const CompareProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<ComparableItem[]>([]);

  const add = useCallback((item: ComparableItem) => {
    setItems((prev) => {
      if (prev.length >= 3 || prev.some((p) => p.id === item.id)) return prev;
      return [...prev, item];
    });
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const has = useCallback((id: string) => items.some((p) => p.id === id), [items]);

  return (
    <CompareContext.Provider value={{ items, add, remove, clear, has }}>
      {children}
    </CompareContext.Provider>
  );
};

export const useCompare = () => {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
};
