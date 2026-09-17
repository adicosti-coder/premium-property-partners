-- 1. Remove the anon/public read policy on the private voice-recordings bucket.
--    All playback paths use signed URLs (createSignedUrl), so no public read is needed.
DROP POLICY IF EXISTS "voice tts cache public read" ON storage.objects;

-- 2. properties: replace the blanket USING (true) SELECT policy with a real predicate.
DROP POLICY IF EXISTS "Properties are publicly readable" ON public.properties;

CREATE POLICY "Active properties are publicly readable"
  ON public.properties
  FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

-- 3. properties: stop exposing internal scraper / pipeline columns to anonymous callers.
REVOKE SELECT ON public.properties FROM anon;
GRANT SELECT (
  id, name, location, description_ro, description_en, features, booking_url, tag,
  image_path, is_active, display_order, created_at, updated_at, status_operativ,
  estimated_revenue, roi_percentage, listing_type, capital_necesar, property_code,
  booking_rating, booking_review_count, base_price_per_night, weekend_price_per_night,
  slug, capacity, bedrooms, bathrooms, size, amenities, amenities_en, house_rules,
  house_rules_en, check_in_time, check_out_time, long_description_ro, long_description_en,
  images, floor, year_built, parking, heating_type, energy_class, furnished,
  construction_type, compartimentare, balconies, terrace_area, has_storage, has_cellar,
  orientation, view_type, has_elevator, intercom_type, has_ac, usable_area, built_area,
  land_area, price_per_sqm, annual_tax, monthly_maintenance, renovation_year,
  property_condition, total_building_floors, apartments_in_building, latitude, longitude,
  expert_insight_ro, expert_insight_en, rooms, kitchens, comfort_level, property_subtype,
  height_regime, destination, image_alts
) ON public.properties TO anon;

-- 4. property_live_data: keep public pricing/rating columns public, hide the internal
--    scraper error column from anonymous callers.
REVOKE SELECT ON public.property_live_data FROM anon;
GRANT SELECT (
  id, property_slug, price_per_night, rating, reviews_count, booking_url,
  booking_com_url, last_price_update, last_rating_update, created_at, updated_at
) ON public.property_live_data TO anon;