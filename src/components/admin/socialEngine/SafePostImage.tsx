import { useEffect, useMemo, useState } from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Accept only absolute http(s) URLs or same-origin paths; rejects "null", blob leftovers, base64 etc. */
export const isValidImageUrl = (u?: string | null): u is string => {
  if (!u || typeof u !== "string") return false;
  const s = u.trim();
  if (!s || s === "null" || s === "undefined") return false;
  if (s.startsWith("/")) return true;
  try { const p = new URL(s); return p.protocol === "https:" || p.protocol === "http:"; } catch { return false; }
};

type Props = { candidates: (string | null | undefined)[]; alt: string; className?: string; fallbackTitle?: string };

/** Tries each candidate image in order (post image → gallery/listing images), then shows a placeholder. */
export function SafePostImage({ candidates, alt, className, fallbackTitle }: Props) {
  const list = useMemo(() => [...new Set(candidates.filter(isValidImageUrl).map((u) => u.trim()))], [candidates.join("|")]);
  const [idx, setIdx] = useState(0);
  useEffect(() => setIdx(0), [list.join("|")]);
  const advance = () => setIdx((i) => (i === idx ? i + 1 : i));
  if (idx >= list.length) {
    // Clean fallback: only the title on the brand background, no broken-image icon.
    if (fallbackTitle) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary via-primary/90 to-primary/70">
          <p className="text-center px-6 text-xs text-primary-foreground/70 font-medium leading-snug line-clamp-3">{fallbackTitle}</p>
        </div>
      );
    }
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary via-primary/90 to-primary/70">
        <ImageIcon className="h-8 w-8 mx-auto text-accent/60" />
      </div>
    );
  }
  return (
    <img
      src={list[idx]}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={advance}
      // Some servers answer 200 with an empty/unsupported payload: the browser shows a broken
      // image without firing onError, so treat "loaded but zero pixels" as an error too.
      onLoad={(e) => { if (!e.currentTarget.naturalWidth) advance(); }}
      className={cn(className)}
    />
  );
}
