UPDATE public.properties
SET image_path = (images)[1]
WHERE image_path IS NULL
  AND images IS NOT NULL
  AND array_length(images, 1) > 0;