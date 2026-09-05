import { useState, useEffect, useRef } from "react";

/**
 * Returns [ref, isVisible] — isVisible becomes true once the sentinel
 * enters the viewport (with a generous rootMargin so components start
 * loading before the user scrolls to them). Once true it never reverts.
 */
export function useLazyVisible(rootMargin = "400px", timeoutMs: number | null = null) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isVisible) return;

    const el = ref.current;

    // Fallback: force visible after timeout regardless of observer
    const timer = timeoutMs == null ? null : setTimeout(() => setIsVisible(true), timeoutMs);

    if (!el || typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      if (timer) clearTimeout(timer);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          if (timer) clearTimeout(timer);
          // Yield to the browser before mounting the heavy subtree so the
          // hydration/LCP task chain is never extended by it (mobile TBT).
          const ric = (window as unknown as {
            requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
          }).requestIdleCallback;
          if (ric) ric(() => setIsVisible(true), { timeout: 1500 });
          else setTimeout(() => setIsVisible(true), 0);
        }
      },
      { rootMargin }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [isVisible, rootMargin, timeoutMs]);

  return [ref, isVisible] as const;
}
