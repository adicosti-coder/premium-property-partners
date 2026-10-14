export type SocialVariant = { caption: string; image_url?: string | null; image_urls?: string[]; video_url?: string | null; story_link_url?: string | null; overlay_text?: string; error?: string | null };
export type SocialVariants = { FEED: SocialVariant; REELS: SocialVariant; STORY: SocialVariant };

export function selectedVariant(type: string): keyof SocialVariants {
  return type === "REELS" ? "REELS" : type === "STORY" ? "STORY" : "FEED";
}