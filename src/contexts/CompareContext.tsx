import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { MockListing } from "@/data/neighborhoods";

interface CompareContextType {
  items: MockListing[];
  add: (listing: MockListing) => void;
  remove: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
}

const CompareContext = createContext<CompareContextType | null>(null);

export const CompareProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<MockListing[]>([]);

  const add = useCallback((listing: MockListing) => {
    setItems((prev) => {
      if (prev.length >= 3 || prev.some((p) => p.id === listing.id)) return prev;
      return [...prev, listing];
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
