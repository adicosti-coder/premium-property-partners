-- Create contest_periods table for managing contest rounds
CREATE TABLE public.contest_periods (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  prize_description text NOT NULL DEFAULT '1 noapte de cazare gratuită',
  is_active boolean NOT NULL DEFAULT false,
  winner_submission_id uuid,
  winner_announced_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create user_article_submissions table for community articles
CREATE TABLE public.user_article_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  contest_period_id uuid REFERENCES public.contest_periods(id) ON DELETE SET NULL,
  title text NOT NULL,
  content text NOT NULL,
  excerpt text,
  cover_image_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'winner')),
  admin_feedback text,
  reviewed_at timestamp with time zone,
  reviewed_by uuid,
  vote_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create article_votes table for tracking votes
CREATE TABLE public.article_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id uuid NOT NULL REFERENCES public.user_article_submissions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(submission_id, user_id)
);

-- Enable RLS
ALTER TABLE public.contest_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_article_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_votes ENABLE ROW LEVEL SECURITY;

-- Contest periods policies
CREATE POLICY "Contest periods are publicly readable"
ON public.contest_periods FOR SELECT
USING (true);

CREATE POLICY "Admins can manage contest periods"
ON public.contest_periods FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Article submissions policies
CREATE POLICY "Users can view approved submissions"
ON public.user_article_submissions FOR SELECT
USING (status IN ('approved', 'winner') OR user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can submit articles"
ON public.user_article_submissions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending submissions"
ON public.user_article_submissions FOR UPDATE
USING (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Users can delete their own pending submissions"
ON public.user_article_submissions FOR DELETE
USING (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Admins can manage all submissions"
ON public.user_article_submissions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Article votes policies
CREATE POLICY "Votes are publicly readable"
ON public.article_votes FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can vote"
ON public.article_votes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own votes"
ON public.article_votes FOR DELETE
USING (auth.uid() = user_id);

-- Create function to update vote count
CREATE OR REPLACE FUNCTION public.update_submission_vote_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.user_article_submissions
    SET vote_count = vote_count + 1
    WHERE id = NEW.submission_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.user_article_submissions
    SET vote_count = vote_count - 1
    WHERE id = OLD.submission_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for vote count
CREATE TRIGGER on_vote_change
AFTER INSERT OR DELETE ON public.article_votes
FOR EACH ROW
EXECUTE FUNCTION public.update_submission_vote_count();

-- Create updated_at triggers
CREATE TRIGGER update_contest_periods_updated_at
BEFORE UPDATE ON public.contest_periods
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_article_submissions_updated_at
BEFORE UPDATE ON public.user_article_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();