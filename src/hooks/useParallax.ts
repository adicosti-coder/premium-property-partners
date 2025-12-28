import { useState, useEffect } from 'react';

interface UseParallaxProps {
  speed?: number;
  direction?: 'up' | 'down';
}

export const useParallax = ({ speed = 0.3, direction = 'up' }: UseParallaxProps = {}) => {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const multiplier = direction === 'up' ? -1 : 1;
      setOffset(window.scrollY * speed * multiplier);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed, direction]);

  return { offset };
};
