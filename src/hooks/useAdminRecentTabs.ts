import { useCallback, useEffect, useState } from "react";

const KEY = "admin:recent-tabs:v1";
const MAX = 5;

export function useAdminRecentTabs(activeTab: string) {
  const [recent, setRecent] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!activeTab || activeTab === "dashboard") return;
    setRecent((curr) => {
      const next = [activeTab, ...curr.filter((v) => v !== activeTab)].slice(0, MAX);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [activeTab]);

  const clear = useCallback(() => {
    setRecent([]);
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return { recent, clear };
}
