import { useCallback, useRef } from "react";

type SoundType = "click" | "success" | "error" | "pop";

interface UseUISoundOptions {
  /** Override the global enabled preference */
  enabled?: boolean;
  /** Volume level (0-1), defaults to global preference or 0.15 */
  volume?: number;
}

// Storage keys for global preferences
const STORAGE_KEY = "ui-sound-preference";
const VOLUME_STORAGE_KEY = "ui-sound-volume";

/**
 * Get global sound preference from localStorage
 */
function getGlobalSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored !== null ? stored === "true" : true;
}

/**
 * Get global volume from localStorage
 */
function getGlobalVolume(): number {
  if (typeof window === "undefined") return 0.15;
  const stored = localStorage.getItem(VOLUME_STORAGE_KEY);
  return stored !== null ? parseFloat(stored) : 0.15;
}

/**
 * A hook for playing subtle UI feedback sounds using the Web Audio API.
 * No external audio files required - generates sounds programmatically.
 * 
 * Respects global sound preference from localStorage unless overridden.
 */
export function useUISound(options: UseUISoundOptions = {}) {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playSound = useCallback(
    (type: SoundType = "click") => {
      // Check global preference unless explicitly overridden
      const enabled = options.enabled !== undefined ? options.enabled : getGlobalSoundEnabled();
      const volume = options.volume !== undefined ? options.volume : getGlobalVolume();
      
      if (!enabled) return;

      try {
        const audioContext = getAudioContext();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        const now = audioContext.currentTime;

        switch (type) {
          case "click":
            // Short, crisp click sound
            oscillator.frequency.setValueAtTime(800, now);
            oscillator.frequency.exponentialRampToValueAtTime(600, now + 0.05);
            oscillator.type = "sine";
            gainNode.gain.setValueAtTime(volume, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
            oscillator.start(now);
            oscillator.stop(now + 0.08);
            break;

          case "success":
            // Pleasant rising tone
            oscillator.frequency.setValueAtTime(400, now);
            oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.15);
            oscillator.type = "sine";
            gainNode.gain.setValueAtTime(volume, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            oscillator.start(now);
            oscillator.stop(now + 0.2);
            break;

          case "error":
            // Low, short buzz
            oscillator.frequency.setValueAtTime(200, now);
            oscillator.frequency.exponentialRampToValueAtTime(150, now + 0.1);
            oscillator.type = "square";
            gainNode.gain.setValueAtTime(volume * 0.5, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            oscillator.start(now);
            oscillator.stop(now + 0.1);
            break;

          case "pop":
            // Soft pop sound for type-ahead matches
            oscillator.frequency.setValueAtTime(1200, now);
            oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.03);
            oscillator.type = "sine";
            gainNode.gain.setValueAtTime(volume * 0.7, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
            oscillator.start(now);
            oscillator.stop(now + 0.06);
            break;
        }
      } catch (error) {
        // Silently fail if audio is not supported
        console.debug("Audio not supported:", error);
      }
    },
    [options.enabled, options.volume, getAudioContext]
  );

  return { playSound };
}
