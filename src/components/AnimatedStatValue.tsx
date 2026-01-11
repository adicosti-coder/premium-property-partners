import { useEffect, useState, useRef } from "react";

interface AnimatedStatValueProps {
  value: number;
  decimals?: number;
  duration?: number;
  formatFn?: (value: number) => string;
}

const AnimatedStatValue = ({ 
  value, 
  decimals = 0, 
  duration = 1500,
  formatFn 
}: AnimatedStatValueProps) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const elementRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [hasAnimated]);

  useEffect(() => {
    if (!hasAnimated) return;

    const startTime = Date.now();
    const endTime = startTime + duration;

    const animate = () => {
      const now = Date.now();

      if (now >= endTime) {
        setDisplayValue(value);
        return;
      }

      const progress = (now - startTime) / duration;
      // Easing function - easeOutQuart for smooth deceleration
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = value * easeOutQuart;

      setDisplayValue(Number(currentValue.toFixed(decimals)));
      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [hasAnimated, value, duration, decimals]);

  // Update value when stats change after initial animation
  useEffect(() => {
    if (hasAnimated) {
      setDisplayValue(value);
    }
  }, [value, hasAnimated]);

  const formattedValue = formatFn 
    ? formatFn(displayValue) 
    : decimals > 0 
      ? displayValue.toFixed(decimals) 
      : displayValue.toLocaleString();

  return (
    <span ref={elementRef} className="tabular-nums">
      {formattedValue}
    </span>
  );
};

export default AnimatedStatValue;