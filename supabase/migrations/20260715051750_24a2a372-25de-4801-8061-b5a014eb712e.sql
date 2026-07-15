
-- 1. Add revealed_field column to admin_access_logs for PII masking audit
ALTER TABLE public.admin_access_logs
  ADD COLUMN IF NOT EXISTS revealed_field text;

CREATE INDEX IF NOT EXISTS idx_admin_access_logs_table_record
  ON public.admin_access_logs(table_name, record_id);

-- 2. RPC to log a PII reveal event from admin UI.
-- SECURITY DEFINER + explicit admin gate. Returns void; never leaks.
CREATE OR REPLACE FUNCTION public.log_pii_reveal(
  _table_name text,
  _record_id text,
  _field text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'access_denied' USING ERRCODE = '42501';
  END IF;

  IF _table_name IS NULL OR length(_table_name) = 0
     OR _field IS NULL OR length(_field) = 0 THEN
    RAISE EXCEPTION 'invalid_arguments' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.admin_access_logs(
    admin_user_id, action_type, table_name, record_id, revealed_field
  ) VALUES (
    auth.uid(), 'pii_reveal', _table_name, _record_id, _field
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_pii_reveal(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_pii_reveal(text, text, text) TO authenticated;
