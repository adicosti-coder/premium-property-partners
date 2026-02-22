import { useState, useEffect, useRef } from "react";

/**
 * Returns [ref, isVisible] — isVisible becomes true once the sentinel
 * enters the viewport (with a generous rootMargin so components start
 * loading before the user scrolls to them). Once true it never reverts.
 */
export function useLazyVisible(rootMargin = "400px") {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || isVisible) return;

    // Fallback: if IntersectionObserver doesn't fire within 3s, force visible
    const fallbackTimer = setTimeout(() => {
      setIsVisible(true);
    }, 3000);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          clearTimeout(fallbackTimer);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(el);
    return () => {
      clearTimeout(fallbackTimer);
      observer.disconnect();
    };
  }, [isVisible, rootMargin]);

  return [ref, isVisible] as const;
}
