import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface AnimationPreferenceContextType {
  animationsEnabled: boolean;
  toggleAnimations: () => void;
  setAnimationsEnabled: (enabled: boolean) => void;
}

const AnimationPreferenceContext = createContext<AnimationPreferenceContextType | undefined>(undefined);

export const AnimationPreferenceProvider = ({ children }: { children: ReactNode }) => {
  const [animationsEnabled, setAnimationsEnabledState] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      // Check localStorage first
      const stored = localStorage.getItem("animationsEnabled");
      if (stored !== null) return stored === "true";
      
      // Fall back to system preference
      return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    return true;
  });

  useEffect(() => {
    localStorage.setItem("animationsEnabled", String(animationsEnabled));
  }, [animationsEnabled]);

  const toggleAnimations = () => {
    setAnimationsEnabledState((prev) => !prev);
  };

  const setAnimationsEnabled = (enabled: boolean) => {
    setAnimationsEnabledState(enabled);
  };

  return (
    <AnimationPreferenceContext.Provider value={{ animationsEnabled, toggleAnimations, setAnimationsEnabled }}>
      {children}
    </AnimationPreferenceContext.Provider>
  );
};

export const useAnimationPreference = () => {
  const context = useContext(AnimationPreferenceContext);
  if (!context) {
    throw new Error("useAnimationPreference must be used within an AnimationPreferenceProvider");
  }
  return context;
};
