-- Create property_reviews table
CREATE TABLE IF NOT EXISTS public.property_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  guest_name text NOT NULL,
  guest_email text,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  content text,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.property_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Published reviews are publicly readable"
ON public.property_reviews
FOR SELECT
USING (is_published = true);

CREATE POLICY "Admins can manage all reviews"
ON public.property_reviews
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners can view reviews for their properties"
ON public.property_reviews
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.owner_properties op
    WHERE op.property_id = property_reviews.property_id
    AND op.user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_property_reviews_updated_at
  BEFORE UPDATE ON public.property_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to notify owner about new review
CREATE OR REPLACE FUNCTION public.notify_owner_new_review()
RETURNS TRIGGER AS $$
DECLARE
  owner_user_id uuid;
  property_name text;
  star_emoji text;
BEGIN
  -- Get property name
  SELECT p.name INTO property_name
  FROM public.properties p
  WHERE p.id = NEW.property_id;

  -- Create star emoji based on rating
  star_emoji := CASE 
    WHEN NEW.rating = 5 THEN '⭐⭐⭐⭐⭐'
    WHEN NEW.rating = 4 THEN '⭐⭐⭐⭐'
    WHEN NEW.rating = 3 THEN '⭐⭐⭐'
    WHEN NEW.rating = 2 THEN '⭐⭐'
    ELSE '⭐'
  END;

  -- Notify each owner of this property
  FOR owner_user_id IN 
    SELECT op.user_id 
    FROM public.owner_properties op 
    WHERE op.property_id = NEW.property_id
  LOOP
    INSERT INTO public.user_notifications (
      user_id, 
      title, 
      message, 
      type, 
      action_url, 
      action_label
    ) VALUES (
      owner_user_id,
      CASE 
        WHEN NEW.rating >= 4 THEN 'Review nou excelent! 🌟'
        WHEN NEW.rating = 3 THEN 'Review nou primit 📝'
        ELSE 'Review nou - atenție necesară ⚠️'
      END,
      NEW.guest_name || ' a lăsat un review ' || star_emoji || ' pentru ' || COALESCE(property_name, 'proprietatea ta') || '. ' || COALESCE('"' || LEFT(NEW.content, 80) || CASE WHEN LENGTH(NEW.content) > 80 THEN '..."' ELSE '"' END, ''),
      CASE 
        WHEN NEW.rating >= 4 THEN 'success'
        WHEN NEW.rating = 3 THEN 'info'
        ELSE 'warning'
      END,
      '/portal-proprietar',
      'Vezi Review'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new reviews
DROP TRIGGER IF EXISTS on_new_review_notify_owner ON public.property_reviews;
CREATE TRIGGER on_new_review_notify_owner
  AFTER INSERT ON public.property_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_owner_new_review();