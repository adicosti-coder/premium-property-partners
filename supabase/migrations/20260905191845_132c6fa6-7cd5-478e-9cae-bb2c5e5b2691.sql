-- The premium article list (slugs + titles) is gated content: no anonymous or
-- ordinary signed-in caller may enumerate it. Execution is limited to
-- server-side/service contexts (edge functions, internal management jobs).
REVOKE EXECUTE ON FUNCTION public.get_premium_article_slugs() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_premium_article_slugs() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_premium_article_slugs() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_premium_article_slugs() TO service_role;