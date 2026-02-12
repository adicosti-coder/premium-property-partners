
-- Create a secure function to get public profile data WITHOUT exposing email
CREATE OR REPLACE FUNCTION public.get_public_profile(p_user_id uuid)
RETURNS TABLE(id uuid, full_name text, avatar_url text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.avatar_url, p.created_at
  FROM public.profiles p
  WHERE p.id = p_user_id;
$$;

-- Revoke direct public access to this function to prevent abuse
REVOKE ALL ON FUNCTION public.get_public_profile(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO anon, authenticated;
