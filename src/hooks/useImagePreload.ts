import { useEffect, useCallback, useRef, useState } from "react";

interface UseImagePreloadOptions {
  /** Whether to start preloading immediately */
  immediate?: boolean;
  /** Number of images to preload ahead of current index */
  preloadAhead?: number;
  /** Number of images to preload behind current index */
  preloadBehind?: number;
  /** Whether the preloading is active (e.g., when lightbox is open) */
  enabled?: boolean;
}

interface UseImagePreloadReturn {
  /** Preload a single image */
  preloadImage: (src: string) => Promise<boolean>;
  /** Preload multiple images */
  preloadImages: (sources: string[]) => Promise<boolean[]>;
  /** Preload images around a specific index */
  preloadAround: (currentIndex: number) => void;
  /** Check if an image is already loaded */
  isLoaded: (src: string) => boolean;
  /** Set of loaded image URLs */
  loadedImages: Set<string>;
  /** Set of images currently loading */
  loadingImages: Set<string>;
}

/**
 * A reusable hook for preloading images to improve navigation performance.
 * 
 * @example
 * // Basic usage - preload a list of images
 * const { preloadImages } = useImagePreload();
 * useEffect(() => {
 *   preloadImages(['/image1.jpg', '/image2.jpg']);
 * }, []);
 * 
 * @example
 * // Carousel/Lightbox usage - preload around current index
 * const { preloadAround } = useImagePreload({ 
 *   images: galleryImages,
 *   preloadAhead: 2,
 *   preloadBehind: 1 
 * });
 * useEffect(() => {
 *   preloadAround(currentIndex);
 * }, [currentIndex]);
 */
export function useImagePreload(
  images: string[] = [],
  options: UseImagePreloadOptions = {}
): UseImagePreloadReturn {
  const {
    immediate = false,
    preloadAhead = 2,
    preloadBehind = 1,
    enabled = true,
  } = options;

  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());
  const preloadedRef = useRef<Set<string>>(new Set());

  // Preload a single image
  const preloadImage = useCallback((src: string): Promise<boolean> => {
    if (!src || preloadedRef.current.has(src)) {
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      const img = new Image();
      
      setLoadingImages(prev => new Set(prev).add(src));
      preloadedRef.current.add(src);

      img.onload = () => {
        setLoadedImages(prev => new Set(prev).add(src));
        setLoadingImages(prev => {
          const next = new Set(prev);
          next.delete(src);
          return next;
        });
        resolve(true);
      };

      img.onerror = () => {
        setLoadingImages(prev => {
          const next = new Set(prev);
          next.delete(src);
          return next;
        });
        resolve(false);
      };

      img.src = src;
    });
  }, []);

  // Preload multiple images
  const preloadImages = useCallback((sources: string[]): Promise<boolean[]> => {
    return Promise.all(sources.map(src => preloadImage(src)));
  }, [preloadImage]);

  // Preload images around a specific index (for carousels/lightboxes)
  const preloadAround = useCallback((currentIndex: number) => {
    if (!enabled || images.length === 0) return;

    const indicesToPreload: number[] = [];

    // Add indices ahead
    for (let i = 1; i <= preloadAhead; i++) {
      const index = (currentIndex + i) % images.length;
      indicesToPreload.push(index);
    }

    // Add indices behind
    for (let i = 1; i <= preloadBehind; i++) {
      const index = (currentIndex - i + images.length) % images.length;
      indicesToPreload.push(index);
    }

    // Preload unique indices
    const uniqueIndices = [...new Set(indicesToPreload)];
    const imagesToPreload = uniqueIndices
      .map(index => images[index])
      .filter(Boolean);

    preloadImages(imagesToPreload);
  }, [enabled, images, preloadAhead, preloadBehind, preloadImages]);

  // Check if an image is loaded
  const isLoaded = useCallback((src: string): boolean => {
    return loadedImages.has(src);
  }, [loadedImages]);

  // Immediate preloading of all images if enabled
  useEffect(() => {
    if (immediate && enabled && images.length > 0) {
      preloadImages(images);
    }
  }, [immediate, enabled, images, preloadImages]);

  return {
    preloadImage,
    preloadImages,
    preloadAround,
    isLoaded,
    loadedImages,
    loadingImages,
  };
}

/**
 * Simplified hook for preloading a single image with loading state
 */
export function useSingleImagePreload(src: string | undefined) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!src) return;

    setIsLoading(true);
    setHasError(false);

    const img = new Image();

    img.onload = () => {
      setIsLoaded(true);
      setIsLoading(false);
    };

    img.onerror = () => {
      setHasError(true);
      setIsLoading(false);
    };

    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return { isLoaded, isLoading, hasError };
}

export default useImagePreload;
