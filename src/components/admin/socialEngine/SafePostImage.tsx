import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

/** Turns any stored value into a loadable URL: absolute http(s), site paths, or bare Storage paths. */
export const toImageUrl = (u?: string | null): string | null => {
  if (!u || typeof u !== "string") return null;
  const s = u.trim();
  if (!s || s === "null" || s === "undefined") return null;
  if (/^https?:\/\//i.test(s) || s.startsWith("/") || s.startsWith("data:image/") || s.startsWith("blob:")) return s;
  // Bare storage path, e.g. "property-images/abc/1.jpg" or "abc/1.jpg"
  const m = s.match(/^(property-images|blog-images|social-images)\/(.+)$/);
  const bucket = m ? m[1] : "property-images";
  const path = m ? m[2] : s;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
};

export const isValidImageUrl = (u?: string | null): u is string => toImageUrl(u) !== null;

type Props = { candidates: (string | null | undefined)[]; alt: string; className?: string; fallbackTitle?: string };

/** Shows the first stored image that loads; the title background appears only when none exists or all fail. */
export function SafePostImage({ candidates, alt, className, fallbackTitle }: Props) {
  const list = useMemo(
    () => [...new Set(candidates.map(toImageUrl).filter((u): u is string => !!u))],
    [candidates.join("|")],
  );
  const [idx, setIdx] = useState(0);
  useEffect(() => setIdx(0), [list.join("|")]);
  if (idx >= list.length) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary via-primary/90 to-primary/70">
        {fallbackTitle && <p className="text-center px-6 text-xs text-primary-foreground/70 font-medium leading-snug line-clamp-3">{fallbackTitle}</p>}
      </div>
    );
  }
  return (
    <img
      key={list[idx]}
      src={list[idx]}
      alt={alt}
      decoding="async"
      onError={() => setIdx((i) => i + 1)}
      className={cn("absolute inset-0", className)}
    />
  );
}
