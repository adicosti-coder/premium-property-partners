import { useState, useCallback, memo } from "react";
import OptimizedImage from "@/components/OptimizedImage";
import { ImageOff } from "lucide-react";

type FallbackType = "placeholder" | "gradient" | "icon" | "custom";

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  sizes?: string;
  aspectRatio?: string;
  fallbackSrc?: string;
  fallbackType?: FallbackType;
  fallbackIcon?: React.ReactNode;
  fallbackGradient?: string;
  retryCount?: number;
  retryDelay?: number;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  onClick?: () => void;
}

const ImageWithFallback = memo(({
  src,
  alt,
  className = "",
  width,
  height,
  priority = false,
  sizes,
  aspectRatio,
  fallbackSrc,
  fallbackType = "gradient",
  fallbackIcon,
  fallbackGradient = "from-muted/60 via-muted/40 to-muted/60",
  retryCount = 2,
  retryDelay = 1000,
  onLoad,
  onError,
  onClick
}: ImageWithFallbackProps) => {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [hasError, setHasError] = useState(false);
  const [retries, setRetries] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    setHasError(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    // Try retry logic first
    if (retries < retryCount) {
      setTimeout(() => {
        setRetries(prev => prev + 1);
        // Force re-render by appending retry count to src
        setCurrentSrc(`${src}${src.includes('?') ? '&' : '?'}retry=${retries + 1}`);
      }, retryDelay);
      return;
    }

    // If we have a fallback source, try it
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setRetries(0);
      return;
    }

    // All fallbacks exhausted
    setHasError(true);
    onError?.(new Error(`Failed to load image: ${src}`));
  }, [src, fallbackSrc, currentSrc, retries, retryCount, retryDelay, onError]);

  // Render fallback content based on type
  const renderFallback = () => {
    const baseClasses = `flex items-center justify-center ${className}`;
    const containerStyle: React.CSSProperties = {
      width,
      height,
      ...(aspectRatio ? { aspectRatio } : {})
    };

    switch (fallbackType) {
      case "custom":
        return fallbackIcon ? (
          <div className={baseClasses} style={containerStyle} onClick={onClick}>
            {fallbackIcon}
          </div>
        ) : null;

      case "icon":
        return (
          <div 
            className={`${baseClasses} bg-muted`} 
            style={containerStyle}
            onClick={onClick}
          >
            <div className="text-center text-muted-foreground p-4">
              <ImageOff className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <span className="text-xs block max-w-[120px] truncate">{alt}</span>
            </div>
          </div>
        );

      case "placeholder":
        return (
          <div 
            className={`${baseClasses} bg-muted`} 
            style={containerStyle}
            onClick={onClick}
          >
            <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/10 flex items-center justify-center">
              <svg
                className="w-12 h-12 text-muted-foreground/30"
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
            </div>
          </div>
        );

      case "gradient":
      default:
        return (
          <div 
            className={`${baseClasses} bg-gradient-to-br ${fallbackGradient}`} 
            style={containerStyle}
            onClick={onClick}
          >
            <div className="text-center text-muted-foreground/60 p-4">
              <ImageOff className="w-8 h-8 mx-auto mb-1 opacity-40" />
              <span className="text-xs opacity-60">Imagine indisponibilă</span>
            </div>
          </div>
        );
    }
  };

  // Show fallback if all attempts failed
  if (hasError) {
    return renderFallback();
  }

  return (
    <OptimizedImage
      src={currentSrc}
      alt={alt}
      className={className}
      width={width}
      height={height}
      priority={priority}
      sizes={sizes}
      aspectRatio={aspectRatio}
      onLoad={handleLoad}
      onClick={onClick}
    />
  );
});

ImageWithFallback.displayName = "ImageWithFallback";

export default ImageWithFallback;
