import { useState, useEffect } from 'react';

interface UseRecentSignupsCounterOptions {
  baseCount?: number;
  incrementInterval?: number;
  maxIncrement?: number;
}

/**
 * Hook that simulates a counter of recent signups for social proof.
 * Starts with a base count and occasionally increments.
 */
export const useRecentSignupsCounter = ({
  baseCount = 127,
  incrementInterval = 15000, // 15 seconds
  maxIncrement = 3
}: UseRecentSignupsCounterOptions = {}) => {
  const [count, setCount] = useState(baseCount);
  const [isIncrementing, setIsIncrementing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      // Random chance to increment (60%)
      if (Math.random() > 0.4) {
        const increment = Math.floor(Math.random() * maxIncrement) + 1;
        setIsIncrementing(true);
        setCount(prev => prev + increment);
        
        // Reset animation state after a short delay
        setTimeout(() => setIsIncrementing(false), 500);
      }
    }, incrementInterval);

    return () => clearInterval(interval);
  }, [incrementInterval, maxIncrement]);

  return { count, isIncrementing };
};

export default useRecentSignupsCounter;
