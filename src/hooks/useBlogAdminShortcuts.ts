import { useEffect } from "react";

interface Opts {
  enabled?: boolean;
  onBulkSave?: () => void;
  onReaudit?: () => void;
}

/**
 * Global keyboard shortcuts for the Blog admin.
 * - Cmd/Ctrl+Shift+S → bulk save (safe: not a browser shortcut)
 * - Cmd/Ctrl+Shift+R → re-audit SEO (safe: not the browser reload combo)
 * Both shortcuts no-op while focus is in an editable field, so typing "R"
 * in an input never triggers them and Cmd+R still reloads the page normally.
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
      if (!mod || !e.shiftKey) return;
      if (isEditable(e.target)) return;
      const key = e.key.toLowerCase();
      if (key === "s" && onBulkSave) {
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
