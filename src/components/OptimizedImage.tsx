import { useState, useRef, useEffect, forwardRef, memo } from "react";

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

const OptimizedImage = memo(forwardRef<HTMLDivElement, OptimizedImageProps>(({
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
}, ref) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  const containerRef = (ref as React.RefObject<HTMLDivElement>) || imgRef;

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
        rootMargin: "200px",
        threshold: 0.01
      }
    );

    const currentRef = imgRef.current;
    if (currentRef) {
      observer.observe(currentRef);
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

  // Check if this is a bundled asset (Vite hashed) or a public/static path
  const isBundledAsset = src.includes("/assets/") && /\-[a-zA-Z0-9]{8}\.\w+$/.test(src);

  // For static images in /public, generate WebP/AVIF variants
  const webpSrc = !isBundledAsset ? src.replace(/\.(jpg|jpeg|png)$/i, '.webp') : undefined;
  const avifSrc = !isBundledAsset ? src.replace(/\.(jpg|jpeg|png)$/i, '.avif') : undefined;

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

      {/* Actual image with <picture> for format negotiation */}
      {isInView && !hasError && (
        <picture>
          {avifSrc && <source srcSet={avifSrc} type="image/avif" />}
          {webpSrc && <source srcSet={webpSrc} type="image/webp" />}
          <img
            src={src}
            alt={alt}
            width={width}
            height={height}
            loading={priority ? "eager" : "lazy"}
            decoding={priority ? "sync" : "async"}
            fetchPriority={priority ? "high" : "auto"}
            sizes={sizes}
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
}));

OptimizedImage.displayName = "OptimizedImage";

export default OptimizedImage;
