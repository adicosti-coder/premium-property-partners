import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

const captionCache = new Map<string, string>();
const CAPTION_CACHE_VERSION = "v2";

export function useImageCaptions(
  images: string[],
  propertyName: string,
  language: string
) {
  const [captions, setCaptions] = useState<Record<number, string>>({});
  const fetchedRef = useRef<Set<string>>(new Set());
  const propertyKey = `${CAPTION_CACHE_VERSION}_${propertyName}_${language}`;

  useEffect(() => {
    if (!images.length || !propertyName) return;

    setCaptions({});
    fetchedRef.current = new Set();

    // Load from cache first
    const cached: Record<number, string> = {};
    let allCached = true;
    images.forEach((img, idx) => {
      const key = `${propertyKey}_${idx}_${img}`;
      if (captionCache.has(key)) {
        cached[idx] = captionCache.get(key)!;
      } else {
        allCached = false;
      }
    });
    if (Object.keys(cached).length > 0) setCaptions(cached);
    if (allCached) return;

    // Fetch captions for uncached images (max 3 concurrent)
    const fetchCaption = async (idx: number) => {
      const img = images[idx];
      const key = `${propertyKey}_${idx}_${img}`;
      if (captionCache.has(key) || fetchedRef.current.has(key)) return;
      fetchedRef.current.add(key);

      try {
        const { data, error } = await supabase.functions.invoke("generate-image-caption", {
          body: { imageUrl: img, propertyName, language },
        });
        if (!error && data?.caption) {
          captionCache.set(key, data.caption);
          setCaptions((prev) => ({ ...prev, [idx]: data.caption }));
        }
      } catch {
        // silent fail
      }
    };

    // Fetch first 3 immediately, rest lazily
    const batch1 = images.slice(0, 3).map((_, idx) => fetchCaption(idx));
    Promise.all(batch1).then(() => {
      // Fetch remaining with delay
      images.slice(3).forEach((_, i) => {
        setTimeout(() => fetchCaption(i + 3), (i + 1) * 800);
      });
    });
  }, [images.length, propertyKey]);

  return captions;
}
