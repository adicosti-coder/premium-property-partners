
-- Status history table for tracking lead status changes
CREATE TABLE public.scraper_lead_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.scraper_leads(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scraper_lead_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage status history"
  ON public.scraper_lead_status_history
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger to auto-log status changes
CREATE OR REPLACE FUNCTION public.log_scraper_lead_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.scraper_lead_status_history (lead_id, old_status, new_status)
    VALUES (NEW.id, OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_scraper_lead_status_change
  AFTER UPDATE ON public.scraper_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.log_scraper_lead_status_change();

-- Enable realtime for scraper_leads
ALTER PUBLICATION supabase_realtime ADD TABLE public.scraper_leads;
