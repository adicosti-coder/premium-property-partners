-- Publish all migrated images for this property
UPDATE public.property_images
SET is_published = true,
    is_primary = (display_order = 0)
WHERE property_id = '5b99e5bc-5652-445b-ad67-da18a92d507c';

-- Update properties table with storage paths
UPDATE public.properties
SET image_path = (
  SELECT image_path FROM public.property_images
  WHERE property_id = '5b99e5bc-5652-445b-ad67-da18a92d507c'
    AND is_published = true
  ORDER BY display_order
  LIMIT 1
),
images = (
  SELECT array_agg(image_path ORDER BY display_order)
  FROM public.property_images
  WHERE property_id = '5b99e5bc-5652-445b-ad67-da18a92d507c'
    AND is_published = true
)
WHERE id = '5b99e5bc-5652-445b-ad67-da18a92d507c';
