import { useRef, useCallback } from "react";

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

const SWIPE_THRESHOLD = 50;

/**
 * Lightweight touch swipe detection for mobile galleries/carousels.
 */
export const useTouchSwipe = (handlers: SwipeHandlers) => {
  const startX = useRef(0);
  const startY = useRef(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const diffX = endX - startX.current;
      const diffY = endY - startY.current;

      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > SWIPE_THRESHOLD) {
        if (diffX > 0) handlers.onSwipeRight?.();
        else handlers.onSwipeLeft?.();
      } else if (Math.abs(diffY) > SWIPE_THRESHOLD) {
        if (diffY > 0) handlers.onSwipeDown?.();
        else handlers.onSwipeUp?.();
      }
    },
    [handlers]
  );

  return { onTouchStart, onTouchEnd };
};
