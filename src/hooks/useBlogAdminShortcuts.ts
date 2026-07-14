import { useEffect } from "react";

interface Opts {
  enabled?: boolean;
  onBulkSave?: () => void;
  onReaudit?: () => void;
}

/**
 * Global keyboard shortcuts for the Blog admin.
 * - Cmd/Ctrl+A → bulk save (only when the target is not a form field, and prevents "select all")
 * - Cmd/Ctrl+R → re-audit SEO (prevents browser reload)
 * Shortcuts are ONLY active while the hook is mounted (i.e. Blog admin page).
 */
export function useBlogAdminShortcuts({ enabled = true, onBulkSave, onReaudit }: Opts) {
  useEffect(() => {
    if (!enabled) return;
    const isEditable = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
    };
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "a" && !isEditable(e.target) && onBulkSave) {
        e.preventDefault();
        onBulkSave();
      } else if (key === "r" && onReaudit) {
        e.preventDefault();
        onReaudit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enabled, onBulkSave, onReaudit]);
}

export default useBlogAdminShortcuts;
