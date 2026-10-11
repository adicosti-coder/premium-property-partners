CREATE OR REPLACE FUNCTION public.guard_article_submission_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending';
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status := OLD.status;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_article_submission_status ON public.user_article_submissions;
CREATE TRIGGER trg_guard_article_submission_status
BEFORE INSERT OR UPDATE ON public.user_article_submissions
FOR EACH ROW EXECUTE FUNCTION public.guard_article_submission_status();