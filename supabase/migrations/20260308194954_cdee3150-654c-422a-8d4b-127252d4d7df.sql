
-- Table to store iCal feed URLs linked to properties
CREATE TABLE public.ical_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  ical_url text NOT NULL,
  label text NOT NULL DEFAULT '',
  pynbooking_room text,
  is_active boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz,
  last_sync_error text,
  events_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(property_id, ical_url)
);

-- Enable RLS
ALTER TABLE public.ical_sources ENABLE ROW LEVEL SECURITY;

-- Only admins can manage iCal sources
CREATE POLICY "Admins can manage ical sources"
  ON public.ical_sources FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Owners can view their own property ical sources
CREATE POLICY "Owners can view their property ical sources"
  ON public.ical_sources FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.owner_properties op
    WHERE op.property_id = ical_sources.property_id
    AND op.user_id = auth.uid()
  ));

-- Service role can manage (for edge functions)
CREATE POLICY "Service role can manage ical sources"
  ON public.ical_sources FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Add ical_event_uid to bookings for deduplication
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS ical_event_uid text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS ical_source_id uuid REFERENCES public.ical_sources(id) ON DELETE SET NULL;

-- Index for fast dedup lookups
CREATE INDEX IF NOT EXISTS idx_bookings_ical_uid ON public.bookings(ical_event_uid) WHERE ical_event_uid IS NOT NULL;
