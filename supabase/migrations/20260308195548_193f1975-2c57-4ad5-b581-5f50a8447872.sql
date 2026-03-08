
-- 1. Create ical_sync_logs table for sync history
CREATE TABLE public.ical_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID REFERENCES public.ical_sources(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  events_found INTEGER NOT NULL DEFAULT 0,
  new_bookings INTEGER NOT NULL DEFAULT 0,
  updated_bookings INTEGER NOT NULL DEFAULT 0,
  deleted_bookings INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  duration_ms INTEGER,
  sync_type TEXT NOT NULL DEFAULT 'auto',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.ical_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sync logs" ON public.ical_sync_logs
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert sync logs" ON public.ical_sync_logs
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Owners can view their property sync logs" ON public.ical_sync_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM owner_properties op
      WHERE op.property_id = ical_sync_logs.property_id
      AND op.user_id = auth.uid()
    )
  );
