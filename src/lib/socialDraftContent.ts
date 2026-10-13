import { formatSocialCaption } from "../../supabase/functions/_shared/socialCaption";
export { formatSocialCaption } from "../../supabase/functions/_shared/socialCaption";

export interface SocialGalleryImage {
  image_path: string;
  original_url: string | null;
  caption: string | null;
  alt_text: string | null;
}

// Storage transformations preserve the object path; query parameters are not identity.
export function socialImageKey(value: string): string {
  const path = value.trim().split(/[?#]/)[0];
  const storage = path.match(/\/storage\/v1\/(?:object|render\/image)\/(?:public|sign)\/(.+)$/);
  try {
    return decodeURIComponent(storage?.[1] ?? path).replace(/^property-images\//, "");
  } catch {
    return storage?.[1] ?? path;
  }
}

const clean = (value: string | null | undefined) => (value ?? "").replace(/\s+/g, " ").trim();

export function describeSocialImage(src: string, gallery: SocialGalleryImage[], title: string, index: number) {
  const key = socialImageKey(src);
  const image = gallery.find((row) => socialImageKey(row.image_path) === key ||
    (row.original_url && socialImageKey(row.original_url) === key));
  const caption = clean(image?.caption) || clean(image?.alt_text);
  return {
    caption,
    alt: clean(image?.alt_text) || caption || `Fotografia ${index + 1} a proprietății ${title}`,
  };
}

/** Readable social copy, using only existing facts and matched gallery captions. */
export function readableSocialPost(post: string, captions: string[]): string {
  const text = post.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, "")
    .split("\n").map((line) => line.trim()).join("\n").trim();
  const descriptions = [...new Set(captions.map(clean).filter(Boolean))];
  if (!descriptions.length || text.includes("În fotografii:")) return text;
  const photoText = `În fotografii: ${descriptions.map((caption) => /[.!?]$/.test(caption) ? caption : `${caption}.`).join(" ")}`;
  const linkIndex = text.indexOf("Detalii și toate pozele:");
  return linkIndex < 0 ? `${text}\n\n${photoText}` :
    `${text.slice(0, linkIndex).trim()}\n\n${photoText}\n\n${text.slice(linkIndex)}`;
}

export interface FacebookPostOptimization {
  title: string;
  description: string;
  hashtags: string;
  link: string;
}

/** Facebook-ready fields derived only from the draft's own facts. */
export function facebookPostOptimization(title: string, postText: string): FacebookPostOptimization {
  const linkMatch = postText.match(/https?:\/\/\S+/);
  const link = linkMatch ? linkMatch[0].replace(/[.,)]+$/, "") : "";
  const plain = postText.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, "");
  const sentences = plain
    .replace(/Detalii și toate pozele:[\s\S]*$/i, "")
    .split(/(?<=[.!?])\s+|\n+/)
    .map(clean)
    .filter((line) => line && !line.startsWith("În fotografii:") && !/^#/.test(line));
  const description = sentences.slice(0, 3).join(" ").slice(0, 300);
  const zoneWords = title
    .replace(/[–—|,()]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !/^(apartament|proprietate|realtrust|vânzare|inchiriere|camer[ae]|camere)$/i.test(word))
    .slice(0, 3)
    .map((word) => `#${word.replace(/[^\p{L}\p{N}]/gu, "")}`);
  const hashtags = [...new Set(["#RealTrust", "#Timisoara", ...zoneWords])].join(" ");
  return { title: clean(title), description, hashtags, link };
}

/** Instagram caption: full optimized text + hashtags, hard-capped at 2200 chars (Instagram limit). */
export function instagramPostDescription(postText: string, hashtags: string, max = 2200): string {
  return formatSocialCaption(postText, { platform: "instagram", type: "property", hashtags, max });
}