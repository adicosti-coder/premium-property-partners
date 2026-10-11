import { useEffect, useState } from "react";

export default function RouteLoading() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Keep prerendered content unobstructed during fast loads.
    const timer = window.setTimeout(() => setVisible(true), 250);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div role="status" aria-live="polite" className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground shadow-lg">
      <span aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-muted border-t-primary motion-reduce:animate-none" />
      <span className="whitespace-nowrap">Se încarcă pagina…</span>
    </div>
  );
}