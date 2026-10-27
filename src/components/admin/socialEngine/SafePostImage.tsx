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
  if (idx >= list.length) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary via-primary/90 to-primary/70">
        <div className="text-center px-6 space-y-2">
          <ImageIcon className="h-8 w-8 mx-auto text-accent/60" />
          {fallbackTitle && <p className="text-xs text-primary-foreground/70 font-medium line-clamp-2">{fallbackTitle}</p>}
        </div>
      </div>
    );
  }
  return <img src={list[idx]} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setIdx((i) => i + 1)} className={cn(className)} />;
}
