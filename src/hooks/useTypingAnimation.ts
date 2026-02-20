import { useState, useEffect, useRef } from 'react';

// Read animation preference once from localStorage — no polling, no intervals
const isAnimationEnabled = (): boolean => {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem("animationsEnabled");
  if (stored !== null) return stored === "true";
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
  // Capture preference once at mount — avoids 100ms polling loop on main thread
  const animationsEnabled = useRef(isAnimationEnabled()).current;

  useEffect(() => {
    // No animations → instantly show full text, zero main-thread cost
    if (!animationsEnabled) {
      setDisplayedText(text);
      setIsComplete(true);
      return;
    }

    setDisplayedText('');
    setIsComplete(false);

    let rafId: number;
    let startTimeout: ReturnType<typeof setTimeout>;
    let charIndex = 0;
    let lastTime = 0;

    // Use rAF instead of setInterval — coalesces with browser paint, avoids long tasks
    const tick = (timestamp: number) => {
      if (timestamp - lastTime >= speed) {
        lastTime = timestamp;
        charIndex++;
        setDisplayedText(text.slice(0, charIndex));
        if (charIndex >= text.length) {
          setIsComplete(true);
          return; // done — no more rAF
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    startTimeout = setTimeout(() => {
      rafId = requestAnimationFrame(tick);
    }, delay);

    return () => {
      clearTimeout(startTimeout);
      cancelAnimationFrame(rafId);
    };
  }, [text, speed, delay, animationsEnabled]);

  return { displayedText, isComplete };
};
