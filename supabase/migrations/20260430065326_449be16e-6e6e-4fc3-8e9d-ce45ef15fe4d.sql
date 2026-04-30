ALTER TABLE public.guest_guides
ADD COLUMN IF NOT EXISTS public_access_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS guest_guides_public_access_token_key
ON public.guest_guides (public_access_token);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'article_votes'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.article_votes;
  END IF;
END $$;