import { useEffect, useRef, useState } from "react";

interface UseScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

/**
 * Fade-in on scroll — with mobile & a11y safety nets:
 *
 *  - On mobile viewports (<768px) and for `prefers-reduced-motion`, content is
 *    visible IMMEDIATELY. Fade-in gates were delaying first paint of copy on
 *    phones and, when the observer never fired, hid content entirely.
 *  - Everywhere else a 700ms fallback timer forces visibility, so a missed
 *    IntersectionObserver callback can never leave content at opacity 0.
 */
const shouldSkipAnimation = (): boolean => {
  if (typeof window === "undefined") return true;
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
    if (window.matchMedia("(max-width: 767px)").matches) return true;
  } catch {
    return false;
  }
  return false;
};

export const useScrollAnimation = (options: UseScrollAnimationOptions = {}) => {
  const { threshold = 0.1, rootMargin = "0px", triggerOnce = true } = options;
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState<boolean>(() => shouldSkipAnimation());

  useEffect(() => {
    if (shouldSkipAnimation()) {
      setIsVisible(true);
      return;
    }

    const element = ref.current;
    if (!element) return;

    // Fail-safe: never leave content hidden if the observer does not fire.
    const fallback = window.setTimeout(() => setIsVisible(true), 700);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      window.clearTimeout(fallback);
      observer.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce]);

  return { ref, isVisible };
};
