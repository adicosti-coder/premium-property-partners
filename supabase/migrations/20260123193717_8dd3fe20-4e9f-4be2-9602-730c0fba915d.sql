-- Create badges definition table
CREATE TABLE public.community_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name_ro TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_ro TEXT NOT NULL,
  description_en TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'award',
  color TEXT NOT NULL DEFAULT 'primary',
  tier TEXT NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  requirement_type TEXT NOT NULL CHECK (requirement_type IN ('votes_received', 'articles_submitted', 'contest_winner', 'first_article', 'comments_made')),
  requirement_value INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user badges table
CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_id UUID NOT NULL REFERENCES public.community_badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Enable RLS on both tables
ALTER TABLE public.community_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- RLS policies for community_badges
CREATE POLICY "Badges are publicly readable"
ON public.community_badges FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage badges"
ON public.community_badges FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for user_badges
CREATE POLICY "User badges are publicly readable"
ON public.user_badges FOR SELECT
USING (true);

CREATE POLICY "System can insert user badges"
ON public.user_badges FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can manage user badges"
ON public.user_badges FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default badges
INSERT INTO public.community_badges (code, name_ro, name_en, description_ro, description_en, icon, color, tier, requirement_type, requirement_value, display_order) VALUES
-- First article badge
('first_article', 'Primul Pas', 'First Step', 'Ai trimis primul tău articol', 'You submitted your first article', 'pencil', 'primary', 'bronze', 'first_article', 1, 1),

-- Articles submitted badges
('writer_bronze', 'Scriitor Începător', 'Beginner Writer', 'Ai trimis 3 articole', 'You submitted 3 articles', 'file-text', 'amber', 'bronze', 'articles_submitted', 3, 2),
('writer_silver', 'Scriitor Dedicat', 'Dedicated Writer', 'Ai trimis 10 articole', 'You submitted 10 articles', 'file-text', 'slate', 'silver', 'articles_submitted', 10, 3),
('writer_gold', 'Scriitor Expert', 'Expert Writer', 'Ai trimis 25 articole', 'You submitted 25 articles', 'file-text', 'amber', 'gold', 'articles_submitted', 25, 4),

-- Votes received badges
('popular_bronze', 'Apreciat', 'Appreciated', 'Ai primit 10 voturi în total', 'You received 10 votes in total', 'heart', 'rose', 'bronze', 'votes_received', 10, 5),
('popular_silver', 'Popular', 'Popular', 'Ai primit 50 voturi în total', 'You received 50 votes in total', 'heart', 'rose', 'silver', 'votes_received', 50, 6),
('popular_gold', 'Foarte Popular', 'Very Popular', 'Ai primit 100 voturi în total', 'You received 100 votes in total', 'heart', 'rose', 'gold', 'votes_received', 100, 7),
('popular_platinum', 'Superstar', 'Superstar', 'Ai primit 500 voturi în total', 'You received 500 votes in total', 'star', 'amber', 'platinum', 'votes_received', 500, 8),

-- Contest winner badges
('winner_bronze', 'Câștigător', 'Winner', 'Ai câștigat un concurs', 'You won a contest', 'trophy', 'amber', 'bronze', 'contest_winner', 1, 9),
('winner_silver', 'Campion', 'Champion', 'Ai câștigat 3 concursuri', 'You won 3 contests', 'trophy', 'slate', 'silver', 'contest_winner', 3, 10),
('winner_gold', 'Legendă', 'Legend', 'Ai câștigat 5 concursuri', 'You won 5 contests', 'trophy', 'amber', 'gold', 'contest_winner', 5, 11),

-- Comments made badges
('commenter_bronze', 'Comentator', 'Commenter', 'Ai lăsat 5 comentarii', 'You left 5 comments', 'message-circle', 'blue', 'bronze', 'comments_made', 5, 12),
('commenter_silver', 'Activ în Comunitate', 'Community Active', 'Ai lăsat 25 comentarii', 'You left 25 comments', 'message-circle', 'blue', 'silver', 'comments_made', 25, 13);

-- Function to check and award badges for a user
CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_votes INTEGER;
  v_articles_count INTEGER;
  v_winner_count INTEGER;
  v_comments_count INTEGER;
  v_badge RECORD;
BEGIN
  -- Count total votes received by user's articles
  SELECT COALESCE(SUM(vote_count), 0) INTO v_total_votes
  FROM user_article_submissions
  WHERE user_id = p_user_id AND status IN ('approved', 'winner');

  -- Count approved/winner articles
  SELECT COUNT(*) INTO v_articles_count
  FROM user_article_submissions
  WHERE user_id = p_user_id AND status IN ('approved', 'winner', 'pending');

  -- Count contest wins
  SELECT COUNT(*) INTO v_winner_count
  FROM user_article_submissions
  WHERE user_id = p_user_id AND status = 'winner';

  -- Count comments made
  SELECT COUNT(*) INTO v_comments_count
  FROM community_article_comments
  WHERE user_id = p_user_id;

  -- Check each active badge
  FOR v_badge IN SELECT * FROM community_badges WHERE is_active = true LOOP
    -- Skip if user already has this badge
    IF EXISTS (SELECT 1 FROM user_badges WHERE user_id = p_user_id AND badge_id = v_badge.id) THEN
      CONTINUE;
    END IF;

    -- Check if user qualifies for this badge
    IF v_badge.requirement_type = 'votes_received' AND v_total_votes >= v_badge.requirement_value THEN
      INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, v_badge.id) ON CONFLICT DO NOTHING;
    ELSIF v_badge.requirement_type = 'articles_submitted' AND v_articles_count >= v_badge.requirement_value THEN
      INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, v_badge.id) ON CONFLICT DO NOTHING;
    ELSIF v_badge.requirement_type = 'first_article' AND v_articles_count >= 1 THEN
      INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, v_badge.id) ON CONFLICT DO NOTHING;
    ELSIF v_badge.requirement_type = 'contest_winner' AND v_winner_count >= v_badge.requirement_value THEN
      INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, v_badge.id) ON CONFLICT DO NOTHING;
    ELSIF v_badge.requirement_type = 'comments_made' AND v_comments_count >= v_badge.requirement_value THEN
      INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, v_badge.id) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger function for article submissions
CREATE OR REPLACE FUNCTION public.trigger_check_badges_on_submission()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_and_award_badges(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger function for votes
CREATE OR REPLACE FUNCTION public.trigger_check_badges_on_vote()
RETURNS TRIGGER AS $$
DECLARE
  v_article_user_id UUID;
BEGIN
  -- Get the article owner
  SELECT user_id INTO v_article_user_id
  FROM user_article_submissions
  WHERE id = COALESCE(NEW.submission_id, OLD.submission_id);

  IF v_article_user_id IS NOT NULL THEN
    PERFORM check_and_award_badges(v_article_user_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger function for comments
CREATE OR REPLACE FUNCTION public.trigger_check_badges_on_comment()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_and_award_badges(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers
CREATE TRIGGER check_badges_after_submission
AFTER INSERT OR UPDATE ON public.user_article_submissions
FOR EACH ROW
EXECUTE FUNCTION public.trigger_check_badges_on_submission();

CREATE TRIGGER check_badges_after_vote
AFTER INSERT OR DELETE ON public.article_votes
FOR EACH ROW
EXECUTE FUNCTION public.trigger_check_badges_on_vote();

CREATE TRIGGER check_badges_after_comment
AFTER INSERT ON public.community_article_comments
FOR EACH ROW
EXECUTE FUNCTION public.trigger_check_badges_on_comment();