-- Restore public read on site_settings so the OLD production build (realtrust.ro) works
-- The new build uses public_site_settings view, but old build still queries site_settings directly
-- This is safe because site_settings only contains hero content + alert thresholds (no passwords/PII)
DROP POLICY IF EXISTS "Only admins can view site settings" ON public.site_settings;

CREATE POLICY "Anyone can read site settings"
ON public.site_settings
FOR SELECT
TO anon, authenticated
USING (true);
