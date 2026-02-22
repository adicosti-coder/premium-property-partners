import { useState, useEffect, useRef } from "react";

/**
 * Returns [ref, isVisible] — isVisible becomes true once the sentinel
 * enters the viewport (with a generous rootMargin so components start
 * loading before the user scrolls to them). Once true it never reverts.
 */
export function useLazyVisible(rootMargin = "400px") {
  const ref = useRef<HTMLDivElement>(null);
  // On mobile, skip lazy-loading entirely to avoid cascading delays
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const [isVisible, setIsVisible] = useState(isMobile);

  useEffect(() => {
    if (isVisible) return;
    const el = ref.current;
    if (!el) return;

    // Short fallback so content always appears
    const fallbackTimer = setTimeout(() => {
      setIsVisible(true);
    }, 1500);

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
