CREATE TABLE public.poi_review_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid,
  poi_id uuid,
  poi_name text,
  rating integer,
  guest_name text,
  email_to text,
  email_sent boolean NOT NULL DEFAULT false,
  email_fallback boolean NOT NULL DEFAULT false,
  whatsapp_configured boolean NOT NULL DEFAULT false,
  whatsapp_status integer,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.poi_review_notifications TO authenticated;
GRANT ALL ON public.poi_review_notifications TO service_role;

ALTER TABLE public.poi_review_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view poi review notifications"
ON public.poi_review_notifications
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_poi_review_notifications_created_at
  ON public.poi_review_notifications (created_at DESC);