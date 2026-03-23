import { supabaseConfig } from "@/lib/supabaseClient";

const GOOGLE_IMAGE_HOSTS = ["googleusercontent.com", "googleapis.com"];

export const isGoogleHostedImage = (src: string): boolean =>
  GOOGLE_IMAGE_HOSTS.some((host) => src.includes(host));

export const resolveExternalImageUrl = (src: string): string => {
  if (!src || !isGoogleHostedImage(src)) {
    return src;
  }

  return `${supabaseConfig.url}/functions/v1/proxy-image?url=${encodeURIComponent(src)}`;
};
