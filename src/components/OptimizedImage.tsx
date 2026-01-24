import { useState, useRef, useEffect, memo } from "react";

interface ImageSize {
  width: number;
  suffix: string;
}

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  sizes?: string;
  aspectRatio?: string;
  onLoad?: () => void;
  onClick?: () => void;
}

// Generate srcset for responsive images
const generateSrcSet = (src: string, sizes: ImageSize[]): string => {
  return sizes
    .map(({ width, suffix }) => {
      const baseName = src.replace(/\.(jpg|jpeg|png|webp)$/i, '');
      const ext = src.match(/\.(jpg|jpeg|png|webp)$/i)?.[0] || '.jpg';
      return `${baseName}${suffix}${ext} ${width}w`;
    })
    .join(', ');
};

// Default responsive sizes
const defaultSizes: ImageSize[] = [
  { width: 320, suffix: '-sm' },
  { width: 640, suffix: '-md' },
  { width: 1024, suffix: '-lg' },
  { width: 1920, suffix: '' },
];

const OptimizedImage = memo(({
  src,
  alt,
  className = "",
  width,
  height,
  priority = false,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  aspectRatio,
  onLoad,
  onClick
}: OptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: "200px", // Start loading 200px before entering viewport
        threshold: 0.01
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority, isInView]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
  };

  // Generate WebP srcset
  const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
  
  // For local assets, use simple srcset; for external URLs, use original
  const isLocalAsset = src.startsWith('/') || src.startsWith('./') || src.includes('/assets/');
  const srcSetValue = isLocalAsset ? generateSrcSet(src, defaultSizes) : undefined;
  const webpSrcSetValue = isLocalAsset ? generateSrcSet(webpSrc, defaultSizes) : undefined;

  const containerStyle: React.CSSProperties = {
    width,
    height,
    ...(aspectRatio ? { aspectRatio } : {})
  };

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={containerStyle}
      onClick={onClick}
    >
      {/* Blur placeholder / skeleton */}
      <div
        className={`absolute inset-0 bg-gradient-to-br from-muted/60 to-muted/40 animate-pulse transition-opacity duration-500 ${
          isLoaded ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        aria-hidden="true"
      />

      {/* Error fallback */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="text-center text-muted-foreground">
            <svg
              className="w-10 h-10 mx-auto mb-2 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-xs">Imagine indisponibilă</span>
          </div>
        </div>
      )}

      {/* Actual image - only render when in view */}
      {isInView && !hasError && (
        <picture>
          {/* WebP source for modern browsers with srcset */}
          <source
            srcSet={webpSrcSetValue || webpSrc}
            sizes={sizes}
            type="image/webp"
          />
          {/* Original format with srcset fallback */}
          <source
            srcSet={srcSetValue || src}
            sizes={sizes}
            type={src.match(/\.png$/i) ? "image/png" : "image/jpeg"}
          />
          <img
            src={src}
            alt={alt}
            width={width}
            height={height}
            loading={priority ? "eager" : "lazy"}
            decoding={priority ? "sync" : "async"}
            fetchPriority={priority ? "high" : "auto"}
            onLoad={handleLoad}
            onError={handleError}
            className={`w-full h-full object-cover transition-all duration-500 ${
              isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105"
            }`}
          />
        </picture>
      )}
    </div>
  );
});

OptimizedImage.displayName = "OptimizedImage";

export default OptimizedImage;