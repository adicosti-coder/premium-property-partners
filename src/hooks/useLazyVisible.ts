import { useState, useEffect, useRef } from "react";

/**
 * Returns [ref, isVisible] — isVisible becomes true once the sentinel
 * enters the viewport (with a generous rootMargin so components start
 * loading before the user scrolls to them). Once true it never reverts.
 */
export function useLazyVisible(rootMargin = "400px", timeoutMs = 15000) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isVisible) return;

    const el = ref.current;

    // Fallback: force visible after timeout regardless of observer
    const timer = setTimeout(() => setIsVisible(true), timeoutMs);

    if (!el || typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      clearTimeout(timer);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
          clearTimeout(timer);
        }
      },
      { rootMargin }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [isVisible, rootMargin, timeoutMs]);

  return [ref, isVisible] as const;
}
