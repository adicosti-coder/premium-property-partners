
CREATE TABLE IF NOT EXISTS scraper_scan_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scanned_at timestamptz DEFAULT now(),
  new_count integer DEFAULT 0,
  blacklisted_skipped integer DEFAULT 0,
  archived_skipped integer DEFAULT 0,
  total_processed integer DEFAULT 0
);

ALTER TABLE scraper_scan_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage scan logs"
  ON scraper_scan_logs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
