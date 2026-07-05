CREATE OR REPLACE FUNCTION public.log_scraper_admin_action(
  _action text,
  _entity_type text DEFAULT NULL,
  _entity_id text DEFAULT NULL,
  _details jsonb DEFAULT '{}'::jsonb,
  _severity text DEFAULT 'info'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _label text;
  _id uuid;
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT COALESCE(email, _uid::text) INTO _label FROM auth.users WHERE id = _uid;

  INSERT INTO public.admin_audit_log (
    action, actor_user_id, actor_label, entity_type, entity_id, details, severity
  ) VALUES (
    _action, _uid, _label, _entity_type, _entity_id, COALESCE(_details, '{}'::jsonb), _severity
  )
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_scraper_admin_action(text, text, text, jsonb, text) TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'admin_audit_log'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_audit_log';
  END IF;
END $$;