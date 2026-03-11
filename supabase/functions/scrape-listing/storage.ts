/**
 * Image download + upload helpers for scrape-listing edge function.
 */

/** Convert Uint8Array to base64 without exceeding call stack */
function uint8ToBase64(bytes: Uint8Array): string {
  const chunkSize = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    for (let j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j]);
    }
  }
  return btoa(binary);
}

/** Remove watermark from image using Lovable AI */
async function removeWatermark(imageBytes: Uint8Array, contentType: string): Promise<Uint8Array> {
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableApiKey) {
    console.log('[Watermark] LOVABLE_API_KEY not set, skipping watermark removal');
    return imageBytes;
  }

  try {
    const base64 = uint8ToBase64(imageBytes);
    const dataUri = `data:${contentType};base64,${base64}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3.1-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Remove any watermarks, phone numbers, or overlaid text from this property photo. Keep the underlying image intact and natural-looking. Return only the cleaned image.',
              },
              {
                type: 'image_url',
                image_url: { url: dataUri },
              },
            ],
          },
        ],
        modalities: ["image", "text"],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      console.log(`[Watermark] AI API error: ${response.status}, skipping removal`);
      return imageBytes;
    }

    const data = await response.json();

    // Check for images array in the response (standard format)
    const images = data?.choices?.[0]?.message?.images;
    if (images && images.length > 0) {
      const imgUrl = images[0]?.image_url?.url;
      if (imgUrl && imgUrl.startsWith('data:')) {
        const b64Match = imgUrl.match(/base64,(.+)/);
        if (b64Match) {
          const cleanedBytes = Uint8Array.from(atob(b64Match[1]), c => c.charCodeAt(0));
          console.log(`[Watermark] Successfully removed watermark (${imageBytes.length} → ${cleanedBytes.length} bytes)`);
          return cleanedBytes;
        }
      }
    }

    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      console.log('[Watermark] No content in AI response, skipping');
      return imageBytes;
    }

    // Look for inline_data in parts
    const parts = data?.choices?.[0]?.message?.parts || [];
    for (const part of parts) {
      if (part?.inline_data?.data) {
        const cleanedBytes = Uint8Array.from(atob(part.inline_data.data), c => c.charCodeAt(0));
        console.log(`[Watermark] Successfully removed watermark (${imageBytes.length} → ${cleanedBytes.length} bytes)`);
        return cleanedBytes;
      }
    }

    // Try extracting base64 from content string
    if (typeof content === 'string') {
      const b64Match = content.match(/data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/);
      if (b64Match) {
        const cleanedBytes = Uint8Array.from(atob(b64Match[1]), c => c.charCodeAt(0));
        console.log(`[Watermark] Extracted cleaned image from response (${cleanedBytes.length} bytes)`);
        return cleanedBytes;
      }
    }

    // Check for image in content array format
    if (Array.isArray(content)) {
      for (const item of content) {
        if (item?.type === 'image_url' && item?.image_url?.url) {
          const match = item.image_url.url.match(/data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/);
          if (match) {
            const cleanedBytes = Uint8Array.from(atob(match[1]), c => c.charCodeAt(0));
            console.log(`[Watermark] Extracted cleaned image (${cleanedBytes.length} bytes)`);
            return cleanedBytes;
          }
        }
      }
    }

    console.log('[Watermark] Could not extract image from AI response, using original');
    return imageBytes;
  } catch (err) {
    console.error('[Watermark] Error during removal:', err);
    return imageBytes;
  }
}

/** Download an image from URL, remove watermarks, and upload to Supabase Storage */
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
    let uint8 = new Uint8Array(arrayBuffer);

    // Remove watermarks using AI
    uint8 = await removeWatermark(uint8, contentType);

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
