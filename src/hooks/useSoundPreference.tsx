import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { safeLocalStorage } from "@/utils/browserStorage";

interface SoundPreferenceContextType {
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  volume: number;
  setVolume: (volume: number) => void;
}

const SoundPreferenceContext = createContext<SoundPreferenceContextType | undefined>(undefined);

const STORAGE_KEY = "ui-sound-preference";
const VOLUME_STORAGE_KEY = "ui-sound-volume";

interface SoundPreferenceProviderProps {
  children: ReactNode;
}

export function SoundPreferenceProvider({ children }: SoundPreferenceProviderProps) {
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    const stored = safeLocalStorage.getItem(STORAGE_KEY);
    return stored !== null ? stored === "true" : true; // Default to enabled
  });

  const [volume, setVolumeState] = useState<number>(() => {
    const stored = safeLocalStorage.getItem(VOLUME_STORAGE_KEY);
    return stored !== null ? parseFloat(stored) : 0.15; // Default volume
  });

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    safeLocalStorage.setItem(STORAGE_KEY, String(enabled));
  };

  const setVolume = (newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);
    safeLocalStorage.setItem(VOLUME_STORAGE_KEY, String(clampedVolume));
  };

  return (
    <SoundPreferenceContext.Provider value={{ soundEnabled, setSoundEnabled, volume, setVolume }}>
      {children}
    </SoundPreferenceContext.Provider>
  );
}

export function useSoundPreference() {
  const context = useContext(SoundPreferenceContext);
  if (context === undefined) {
    throw new Error("useSoundPreference must be used within a SoundPreferenceProvider");
  }
  return context;
}

/**
 * Safe hook that returns default values if used outside provider.
 * Useful for components that may be rendered before the provider is mounted.
 */
export function useSoundPreferenceSafe(): SoundPreferenceContextType {
  const context = useContext(SoundPreferenceContext);
  if (context === undefined) {
    // Return defaults when used outside provider
    const stored = safeLocalStorage.getItem(STORAGE_KEY);
    const soundEnabled = stored !== null ? stored === "true" : true;
    const storedVolume = safeLocalStorage.getItem(VOLUME_STORAGE_KEY);
    const volume = storedVolume !== null ? parseFloat(storedVolume) : 0.15;
    
    return {
      soundEnabled,
      setSoundEnabled: (enabled: boolean) => {
        safeLocalStorage.setItem(STORAGE_KEY, String(enabled));
      },
      volume,
      setVolume: (newVolume: number) => {
        safeLocalStorage.setItem(VOLUME_STORAGE_KEY, String(newVolume));
      },
    };
  }
  return context;
}
