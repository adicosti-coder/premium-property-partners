import { useRef, useState, useCallback, useEffect } from "react";
import { useHapticFeedback } from "./useHapticFeedback";

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxPull?: number;
  disabled?: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 120,
  disabled = false,
}: PullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  
  const startY = useRef(0);
  const currentY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { lightTap, successFeedback } = useHapticFeedback();

  const isAtTop = useCallback(() => {
    return window.scrollY <= 0;
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing || !isAtTop()) return;
    
    startY.current = e.touches[0].clientY;
    setIsPulling(true);
  }, [disabled, isRefreshing, isAtTop]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing || !isPulling || !isAtTop()) {
      setPullDistance(0);
      return;
    }

    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;

    if (diff > 0) {
      // Apply resistance factor for natural feel
      const resistance = 0.5;
      const distance = Math.min(diff * resistance, maxPull);
      setPullDistance(distance);

      // Haptic feedback when crossing threshold
      if (distance >= threshold && pullDistance < threshold) {
        lightTap();
      }
    }
  }, [disabled, isRefreshing, isPulling, isAtTop, maxPull, threshold, pullDistance, lightTap]);

  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing) return;

    setIsPulling(false);

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      successFeedback();
      
      try {
        await onRefresh();
      } catch (error) {
        console.error("Refresh failed:", error);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [disabled, isRefreshing, pullDistance, threshold, onRefresh, successFeedback]);

  useEffect(() => {
    const container = containerRef.current || document;

    container.addEventListener("touchstart", handleTouchStart as EventListener, { passive: true });
    container.addEventListener("touchmove", handleTouchMove as EventListener, { passive: true });
    container.addEventListener("touchend", handleTouchEnd as EventListener, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart as EventListener);
      container.removeEventListener("touchmove", handleTouchMove as EventListener);
      container.removeEventListener("touchend", handleTouchEnd as EventListener);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min(pullDistance / threshold, 1);

  return {
    containerRef,
    pullDistance,
    isRefreshing,
    isPulling,
    progress,
    canRefresh: pullDistance >= threshold,
  };
}
