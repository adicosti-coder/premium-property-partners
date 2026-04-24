import { useCallback, useEffect, useState } from "react";

const KEY = "admin:pinned-tabs:v1";

export function useAdminPinned() {
  const [pinned, setPinned] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as string[]) : ["dashboard", "leads", "prospect-listings"];
    } catch {
      return ["dashboard", "leads", "prospect-listings"];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(pinned));
    } catch {
      /* ignore */
    }
  }, [pinned]);

  const toggle = useCallback((value: string) => {
    setPinned((curr) =>
      curr.includes(value) ? curr.filter((v) => v !== value) : [...curr, value]
    );
  }, []);

  return { pinned, toggle };
}
