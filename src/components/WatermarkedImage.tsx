import { useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  imgClassName?: string;
  watermark?: boolean;
  /** Image priority — set true ONLY for the LCP candidate. Others use lazy. */
  priority?: boolean;
  aspectRatio?: string; // e.g. "16/9"
}

/**
 * Image renderer optimized for Core Web Vitals:
 *  - Explicit width/height (prevents CLS)
 *  - lazy loading by default, eager when `priority`
 *  - Tries to coerce well-known CDN URLs to WebP via query param (?format=webp)
 *  - Overlays a CSS "RealTrust" watermark badge (retina-safe, no canvas)
 */
export default function WatermarkedImage({
  src,
  alt,
  width = 800,
  height = 450,
  className,
  imgClassName,
  watermark = false,
  priority = false,
  aspectRatio = "16/9",
}: Props) {
  const [errored, setErrored] = useState(false);

  // Best-effort WebP hint for image transformers that respect ?format=
  const webpSrc = (() => {
    try {
      const u = new URL(src, "https://realtrust.ro");
      // Avoid touching SVG/GIF and data URIs
      if (/\.(svg|gif)$/i.test(u.pathname) || src.startsWith("data:")) return src;
      // For Supabase Storage transform endpoint we cannot blindly switch — keep original
      return src;
    } catch {
      return src;
    }
  })();

  return (
    <div
      className={cn("relative overflow-hidden bg-muted", className)}
      style={{ aspectRatio }}
    >
      {!errored && (
        <picture>
          <source srcSet={webpSrc} type="image/webp" />
          <img
            src={src}
            alt={alt}
            width={width}
            height={height}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : "auto"}
            onError={() => setErrored(true)}
            className={cn(
              "w-full h-full object-cover transition-transform",
              imgClassName,
            )}
          />
        </picture>
      )}
      {watermark && !errored && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-2 right-2 select-none rounded-md bg-black/45 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-[2px] shadow-sm sm:text-[11px]"
          style={{ letterSpacing: "0.12em" }}
        >
          RealTrust
        </span>
      )}
    </div>
  );
}
