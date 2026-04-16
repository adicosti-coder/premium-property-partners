import { useEffect } from "react";

interface ShortcutHandlers {
  onNext?: () => void;
  onPrev?: () => void;
  onWhatsApp?: () => void;
  onArchive?: () => void;
  onEscape?: () => void;
  onStatusChange?: (status: string) => void;
  onAIInsight?: () => void;
  enabled?: boolean;
}

const STATUS_KEYS: Record<string, string> = {
  "1": "new",
  "2": "reviewed",
  "3": "contacted",
  "4": "interested",
  "5": "meeting",
  "6": "converted",
  "7": "rejected",
};

/**
 * Keyboard shortcuts for ScraperLeads page.
 * J/↓ next · K/↑ prev · W WhatsApp · A archive · I AI insight · Esc close · 1-7 status
 */
export function useScraperKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    if (handlers.enabled === false) return;

    const onKey = (e: KeyboardEvent) => {
      // Don't intercept when typing
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if ((e.target as HTMLElement)?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const k = e.key.toLowerCase();

      if (k === "j" || e.key === "ArrowDown") { handlers.onNext?.(); e.preventDefault(); return; }
      if (k === "k" || e.key === "ArrowUp") { handlers.onPrev?.(); e.preventDefault(); return; }
      if (k === "w") { handlers.onWhatsApp?.(); e.preventDefault(); return; }
      if (k === "a") { handlers.onArchive?.(); e.preventDefault(); return; }
      if (k === "i") { handlers.onAIInsight?.(); e.preventDefault(); return; }
      if (k === "escape") { handlers.onEscape?.(); return; }

      if (STATUS_KEYS[k] && handlers.onStatusChange) {
        handlers.onStatusChange(STATUS_KEYS[k]);
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlers]);
}

export const SHORTCUTS_HELP = [
  { keys: "J / ↓", action: "Lead următor" },
  { keys: "K / ↑", action: "Lead anterior" },
  { keys: "W", action: "Trimite WhatsApp" },
  { keys: "I", action: "AI Insight" },
  { keys: "A", action: "Arhivează" },
  { keys: "1-7", action: "Schimbă status" },
  { keys: "Esc", action: "Închide panoul" },
];
