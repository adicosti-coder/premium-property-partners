import { useState, useRef, useEffect, forwardRef, memo } from "react";
import { cloudinaryUrl, cloudinarySrcSet } from "@/utils/cloudinaryUrl";
import { storageImage, storageImageSrcSet } from "@/utils/supabaseImage";
import { isGoogleHostedImage, resolveExternalImageUrl } from "@/utils/resolveExternalImageUrl";

interface OptimizedImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  sizes?: string;
  aspectRatio?: string;
  onLoad?: () => void;
  onError?: () => void;
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
  onError,
  onClick
}, ref) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  const containerRef = (ref as React.RefObject<HTMLDivElement>) || imgRef;

  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
  }, [src]);

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
    onError?.();
  };

  // Guard against missing src (scraped listings without imagery, race conditions, etc.)
  const safeSrc = typeof src === "string" ? src : "";
  const hasSrc = safeSrc.length > 0;

  // Google Places images need server-side proxy due to hotlink protection
  const isGoogleImage = hasSrc && isGoogleHostedImage(safeSrc);

  // Determine if we should route through Cloudinary CDN
  const isSkipCdn =
    !hasSrc ||
    safeSrc.startsWith("data:") ||
    safeSrc.startsWith("blob:") ||
    safeSrc.includes("res.cloudinary.com") ||
    isGoogleImage;

  // Proxy Google Places images through our edge function
  const resolvedSrc = hasSrc ? resolveExternalImageUrl(safeSrc) : "";

  // Build Cloudinary-optimised src (f_auto, q_auto, responsive width)
  const cdnSrc = isSkipCdn ? resolvedSrc : cloudinaryUrl(safeSrc, { width });
  const cdnSrcSet = isSkipCdn ? undefined : cloudinarySrcSet(safeSrc);

  // CLS guard: if neither explicit dimensions nor an aspectRatio are supplied,
  // reserve a 4/3 box so the container never collapses to 0px before the image
  // decodes (each collapsed card was contributing layout shift on mobile).
  const hasExplicitBox = (width !== undefined && height !== undefined) || Boolean(aspectRatio);
  const containerStyle: React.CSSProperties = {
    width,
    height,
    ...(aspectRatio ? { aspectRatio } : {}),
    ...(hasExplicitBox ? {} : { aspectRatio: "4 / 3", width: "100%" })
  };

  return (
    <div
      ref={containerRef}
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

      {/* Empty-src fallback (e.g. scraped listing without imagery) */}
      {!hasSrc && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/40">
          <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}

      {/* Actual image with <picture> for format negotiation */}
      {hasSrc && isInView && !hasError && (
        <img
          src={cdnSrc}
          srcSet={cdnSrcSet}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          decoding={priority ? "sync" : "async"}
          {...({ fetchpriority: priority ? "high" : "auto" } as Record<string, string>)}
          sizes={sizes}
          referrerPolicy="no-referrer"
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full object-cover transition-all duration-500 ${
            isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105"
          }`}
        />
      )}
    </div>
  );
}));

OptimizedImage.displayName = "OptimizedImage";

export default OptimizedImage;
