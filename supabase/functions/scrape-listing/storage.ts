/**
 * Image download + upload helpers for scrape-listing edge function.
 */

/** Download an image from URL and upload to Supabase Storage */
export async function downloadAndUploadImage(
  imageUrl: string,
  supabase: any,
  propertyId: string,
  index: number
): Promise<string | null> {
  try {
    const response = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RealTrust/1.0)' },
    });
    if (!response.ok) return null;

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
      return null;
    }

    const { data: publicUrl } = supabase.storage
      .from('property-images')
      .getPublicUrl(filePath);

    return publicUrl?.publicUrl || null;
  } catch (err) {
    console.error(`Failed to download/upload image ${index}:`, err);
    return null;
  }
}

/** Upload images and update property records */
export async function uploadImagesForProperty(
  imageUrls: string[],
  supabase: any,
  propertyId: string
): Promise<string[]> {
  const uploadedImages: string[] = [];
  for (let i = 0; i < imageUrls.length; i++) {
    const uploaded = await downloadAndUploadImage(imageUrls[i], supabase, propertyId, i);
    if (uploaded) uploadedImages.push(uploaded);
    if (i < imageUrls.length - 1) await new Promise(r => setTimeout(r, 300));
  }

  if (uploadedImages.length > 0) {
    await supabase.from('properties').update({
      image_path: uploadedImages[0],
      images: uploadedImages,
    }).eq('id', propertyId);

    const imageEntries = uploadedImages.map((imgPath, idx) => ({
      property_id: propertyId,
      image_path: imgPath,
      display_order: idx,
      is_primary: idx === 0,
    }));
    await supabase.from('property_images').insert(imageEntries);
  }

  return uploadedImages;
}
