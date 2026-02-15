import { useCallback, useRef } from "react";

/**
 * Client-side form submit throttle.
 * Prevents repeated submits within `cooldownMs` (default 3s).
 * Returns `{ throttledSubmit, isThrottled }`.
 */
export function useFormThrottle(cooldownMs = 3000) {
  const lastSubmitRef = useRef(0);
  const isThrottledRef = useRef(false);

  const throttledSubmit = useCallback(
    (fn: () => void | Promise<void>) => {
      const now = Date.now();
      if (now - lastSubmitRef.current < cooldownMs) {
        isThrottledRef.current = true;
        return;
      }
      lastSubmitRef.current = now;
      isThrottledRef.current = false;
      fn();
    },
    [cooldownMs]
  );

  return {
    throttledSubmit,
    get isThrottled() {
      return isThrottledRef.current;
    },
  };
}
