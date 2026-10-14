export type SocialVariant = { caption: string; image_url?: string | null; image_urls?: string[]; video_url?: string | null; story_link_url?: string | null; overlay_text?: string; error?: string | null };
export type SocialVariants = { FEED: SocialVariant; REELS: SocialVariant; STORY: SocialVariant };

export function readSocialVariants(value: unknown): SocialVariants | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  for (const key of ["FEED", "REELS", "STORY"]) {
    const item = v[key];
    if (!item || typeof item !== "object" || typeof (item as Record<string, unknown>).caption !== "string") return null;
  }
  return value as SocialVariants;
}

export function selectedVariant(type: string): keyof SocialVariants {
  return type === "REELS" ? "REELS" : type === "STORY" ? "STORY" : "FEED";
}