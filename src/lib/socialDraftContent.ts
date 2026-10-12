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