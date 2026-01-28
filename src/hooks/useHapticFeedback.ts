import { useCallback } from "react";

type HapticPattern = "light" | "medium" | "heavy" | "success" | "warning" | "error";

// Vibration patterns in milliseconds
const VIBRATION_PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 10],
  warning: [25, 50, 25],
  error: [50, 100, 50, 100, 50],
};

export function useHapticFeedback() {
  const isSupported = typeof navigator !== "undefined" && "vibrate" in navigator;

  const triggerHaptic = useCallback((pattern: HapticPattern = "light") => {
    if (!isSupported) return;

    try {
      const vibrationPattern = VIBRATION_PATTERNS[pattern];
      navigator.vibrate(vibrationPattern);
    } catch {
      // Silently fail if vibration fails
    }
  }, [isSupported]);

  const cancelHaptic = useCallback(() => {
    if (!isSupported) return;
    navigator.vibrate(0);
  }, [isSupported]);

  return {
    isSupported,
    triggerHaptic,
    cancelHaptic,
    // Convenience methods
    lightTap: () => triggerHaptic("light"),
    mediumTap: () => triggerHaptic("medium"),
    heavyTap: () => triggerHaptic("heavy"),
    successFeedback: () => triggerHaptic("success"),
    warningFeedback: () => triggerHaptic("warning"),
    errorFeedback: () => triggerHaptic("error"),
  };
}
