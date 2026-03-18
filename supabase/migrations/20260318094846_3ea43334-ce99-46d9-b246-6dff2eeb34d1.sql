-- Sync properties.images and image_path from property_images (published only)
-- This fixes mixed/stale image arrays

UPDATE public.properties p
SET 
  images = sub.published_images,
  image_path = sub.primary_image
FROM (
  SELECT 
    property_id,
    array_agg(image_path ORDER BY display_order) as published_images,
    (array_agg(image_path ORDER BY display_order))[1] as primary_image
  FROM public.property_images
  WHERE is_published = true
  GROUP BY property_id
) sub
WHERE p.id = sub.property_id;