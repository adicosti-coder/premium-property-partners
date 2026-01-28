import { useRef, useEffect, useCallback } from "react";

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

interface SwipeConfig {
  threshold?: number;
  preventScroll?: boolean;
}

export function useTouchGestures(
  handlers: SwipeHandlers,
  config: SwipeConfig = {}
) {
  const { threshold = 50, preventScroll = false } = config;
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchEndRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartRef.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    };
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    touchEndRef.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    };
    
    if (preventScroll) {
      e.preventDefault();
    }
  }, [preventScroll]);

  const handleTouchEnd = useCallback(() => {
    if (!touchStartRef.current || !touchEndRef.current) return;

    const deltaX = touchStartRef.current.x - touchEndRef.current.x;
    const deltaY = touchStartRef.current.y - touchEndRef.current.y;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Determine if horizontal or vertical swipe
    if (absDeltaX > absDeltaY) {
      // Horizontal swipe
      if (absDeltaX > threshold) {
        if (deltaX > 0) {
          handlers.onSwipeLeft?.();
        } else {
          handlers.onSwipeRight?.();
        }
      }
    } else {
      // Vertical swipe
      if (absDeltaY > threshold) {
        if (deltaY > 0) {
          handlers.onSwipeUp?.();
        } else {
          handlers.onSwipeDown?.();
        }
      }
    }

    // Reset refs
    touchStartRef.current = null;
    touchEndRef.current = null;
  }, [handlers, threshold]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}

export function useSwipeableElement(
  elementRef: React.RefObject<HTMLElement>,
  handlers: SwipeHandlers,
  config: SwipeConfig = {}
) {
  const gestures = useTouchGestures(handlers, config);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener("touchstart", gestures.onTouchStart, { passive: true });
    element.addEventListener("touchmove", gestures.onTouchMove, { passive: !config.preventScroll });
    element.addEventListener("touchend", gestures.onTouchEnd, { passive: true });

    return () => {
      element.removeEventListener("touchstart", gestures.onTouchStart);
      element.removeEventListener("touchmove", gestures.onTouchMove);
      element.removeEventListener("touchend", gestures.onTouchEnd);
    };
  }, [elementRef, gestures, config.preventScroll]);
}
