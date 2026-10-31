export type GalleryImage = { url: string; selected: boolean };
export const selectedGalleryUrls = (images: GalleryImage[]): string[] => [...new Set(images.filter(image => image.selected).map(image => image.url))];
export function requireSocialGallery(images: GalleryImage[]): string[] {
  const urls = selectedGalleryUrls(images);
  if (urls.length < 3) throw new Error("Selectează minimum 3 imagini pentru salvare.");
  return urls;
}