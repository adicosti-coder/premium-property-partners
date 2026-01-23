-- Enable realtime for article_votes table to support live leaderboard
ALTER PUBLICATION supabase_realtime ADD TABLE public.article_votes;