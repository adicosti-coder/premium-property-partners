/**
 * Image download + upload helpers for scrape-listing edge function.
 * Now supports draft/published workflow — all original images are saved,
 * only selected ones are marked as published.
 */

/** Download an image from URL and upload to Supabase Storage */
export async function downloadAndUploadImage(
  imageUrl: string,
  supabase: any,
  propertyId: string,
  index: number
): Promise<{ storagePath: string | null; originalUrl: string }> {
  try {
    const response = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RealTrust/1.0)' },
    });
    if (!response.ok) return { storagePath: null, originalUrl: imageUrl };

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    const filePath = `${propertyId}/imported-${index}.${ext}`;

    const { error } = await supabase.storage
      .from('property-images')
      .upload(filePath, uint8, { contentType, upsert: true });

    if (error) {
      console.error(`Upload error for image ${index}:`, error.message);
      return { storagePath: null, originalUrl: imageUrl };
    }

    const { data: publicUrl } = supabase.storage
      .from('property-images')
      .getPublicUrl(filePath);

    return { storagePath: publicUrl?.publicUrl || null, originalUrl: imageUrl };
  } catch (err) {
    console.error(`Failed to download/upload image ${index}:`, err);
    return { storagePath: null, originalUrl: imageUrl };
  }
}

/**
 * Upload ALL original images and create property_images entries.
 * Images in `publishedUrls` are marked is_published=true, rest as drafts.
 */
export async function uploadImagesForProperty(
  allOriginalUrls: string[],
  publishedUrls: string[],
  supabase: any,
  propertyId: string
): Promise<{ published: string[]; drafts: number }> {
  const publishedSet = new Set(publishedUrls.map(u => u.trim()));
  const uploadedPublished: string[] = [];
  let draftCount = 0;

  for (let i = 0; i < allOriginalUrls.length; i++) {
    const originalUrl = allOriginalUrls[i].trim();
    const { storagePath } = await downloadAndUploadImage(originalUrl, supabase, propertyId, i);
    if (!storagePath) continue;

    const isPublished = publishedSet.has(originalUrl);
    if (isPublished) uploadedPublished.push(storagePath);
    else draftCount++;

    // Insert into property_images with draft/published flag
    await supabase.from('property_images').insert({
      property_id: propertyId,
      image_path: storagePath,
      original_url: originalUrl,
      display_order: isPublished ? uploadedPublished.length - 1 : 1000 + i,
      is_primary: isPublished && uploadedPublished.length === 1,
      is_published: isPublished,
    });

    if (i < allOriginalUrls.length - 1) await new Promise(r => setTimeout(r, 300));
  }

  // Update properties with only published images
  if (uploadedPublished.length > 0) {
    await supabase.from('properties').update({
      image_path: uploadedPublished[0],
      images: uploadedPublished,
    }).eq('id', propertyId);
  }

  return { published: uploadedPublished, drafts: draftCount };
}
