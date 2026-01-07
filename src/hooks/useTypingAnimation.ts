import { useState, useEffect, useContext } from 'react';

// Simple hook to check animation preference from localStorage (works without context)
const useAnimationEnabled = () => {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("animationsEnabled");
      if (stored !== null) return stored === "true";
      return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    return true;
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem("animationsEnabled");
      if (stored !== null) {
        setEnabled(stored === "true");
      }
    };

    // Listen for storage changes (from other tabs or same-tab updates)
    window.addEventListener('storage', handleStorageChange);
    
    // Also poll for changes (for same-tab updates)
    const interval = setInterval(() => {
      const stored = localStorage.getItem("animationsEnabled");
      if (stored !== null) {
        const newValue = stored === "true";
        setEnabled(prev => prev !== newValue ? newValue : prev);
      }
    }, 100);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  return enabled;
};

interface UseTypingAnimationProps {
  text: string;
  speed?: number;
  delay?: number;
}

export const useTypingAnimation = ({
  text,
  speed = 50,
  delay = 0
}: UseTypingAnimationProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const animationsEnabled = useAnimationEnabled();

  useEffect(() => {
    // If animations are disabled, show text immediately
    if (!animationsEnabled) {
      setDisplayedText(text);
      setIsComplete(true);
      return;
    }

    setDisplayedText('');
    setIsComplete(false);
    
    const startTimeout = setTimeout(() => {
      let currentIndex = 0;
      
      const typeInterval = setInterval(() => {
        if (currentIndex < text.length) {
          setDisplayedText(text.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(typeInterval);
          setIsComplete(true);
        }
      }, speed);

      return () => clearInterval(typeInterval);
    }, delay);

    return () => clearTimeout(startTimeout);
  }, [text, speed, delay, animationsEnabled]);

  return { displayedText, isComplete };
};
