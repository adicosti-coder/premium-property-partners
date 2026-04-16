import { supabase } from "@/lib/supabaseClient";

const PROPERTY_IMAGES_BUCKET = "property-images";

const extractStoragePathFromUrl = (urlValue: string): string | null => {
  try {
    const parsed = new URL(urlValue);
    const prefixes = [
      `/storage/v1/object/public/${PROPERTY_IMAGES_BUCKET}/`,
      `/storage/v1/object/sign/${PROPERTY_IMAGES_BUCKET}/`,
      `/storage/v1/render/image/public/${PROPERTY_IMAGES_BUCKET}/`,
    ];

    for (const prefix of prefixes) {
      const index = parsed.pathname.indexOf(prefix);
      if (index >= 0) {
        return decodeURIComponent(parsed.pathname.slice(index + prefix.length));
      }
    }

    return null;
  } catch {
    return null;
  }
};

export const resolvePropertyImageUrl = (value: string | null | undefined): string | null => {
  if (!value) return null;

  const normalized = value.trim();
  if (!normalized) return null;

  if (
    normalized.startsWith("data:image/") ||
    normalized.startsWith("blob:") ||
    normalized.startsWith("/")
  ) {
    return normalized;
  }

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    const storagePath = extractStoragePathFromUrl(normalized);
    if (storagePath) {
      return supabase.storage.from(PROPERTY_IMAGES_BUCKET).getPublicUrl(storagePath).data.publicUrl;
    }

    return normalized;
  }

  const path = normalized.replace(/^property-images\//, "").replace(/^\//, "");
  return supabase.storage.from(PROPERTY_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl;
};

/**
 * Returns a thumbnail URL using Supabase Storage image transformation.
 * Appends render endpoint params for server-side resize + WebP conversion.
 */
export const resolvePropertyThumbnailUrl = (
  value: string | null | undefined,
  width = 200,
  height = 200,
  quality = 60,
): string | null => {
  const fullUrl = resolvePropertyImageUrl(value);
  if (!fullUrl) return null;

  // Only transform Supabase storage URLs
  if (!fullUrl.includes("/storage/v1/object/public/")) return fullUrl;

  // Replace /object/public/ with /render/image/public/ and add params
  const renderUrl = fullUrl.replace(
    "/storage/v1/object/public/",
    "/storage/v1/render/image/public/",
  );
  return `${renderUrl}?width=${width}&height=${height}&resize=cover&quality=${quality}`;
};