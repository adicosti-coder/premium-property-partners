-- 1) Internal helpers used only by admin-guarded wrappers: no direct calls from app users.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('get_listing_price_report','get_listing_price_report_v2','get_listing_price_report_v3',
                        'get_zone_price_report','get_zone_price_report_v3')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- 2) Reports called directly by the admin UI / internal jobs: keep the original body
--    as *_unguarded (service-only) and expose a same-named wrapper that requires admin.
DO $$
DECLARE
  r record;
  call_args text;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname,
           pg_get_function_arguments(p.oid) AS args,
           pg_get_function_identity_arguments(p.oid) AS id_args,
           pg_get_function_result(p.oid) AS res
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('get_zone_price_report_v2','get_daily_price_trends',
                        'get_prospect_injection_daily_summary','get_prospect_injection_rejection_summary',
                        'get_prospect_injection_rejection_trend')
  LOOP
    SELECT string_agg(quote_ident(a), ', ' ORDER BY ord) INTO call_args
    FROM unnest(
      (SELECT array_agg(pa) FROM unnest(
         (SELECT proargnames[1:pronargs] FROM pg_proc WHERE oid = r.oid)) pa)
    ) WITH ORDINALITY AS t(a, ord);

    EXECUTE format('ALTER FUNCTION public.%I(%s) RENAME TO %I', r.proname, r.id_args, r.proname || '_unguarded');
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated', r.proname || '_unguarded', r.id_args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role', r.proname || '_unguarded', r.id_args);

    EXECUTE format($f$
      CREATE FUNCTION public.%1$I(%2$s) RETURNS %3$s
      LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
      AS $body$
      BEGIN
        IF NOT (coalesce(auth.role(), '') = 'service_role'
                OR public.has_role(auth.uid(), 'admin')
                OR public.has_role(auth.uid(), 'super_admin')) THEN
          RAISE EXCEPTION 'permission denied: admin only' USING ERRCODE = '42501';
        END IF;
        RETURN QUERY SELECT * FROM public.%4$I(%5$s);
      END
      $body$;
    $f$, r.proname, r.args, r.res, r.proname || '_unguarded', coalesce(call_args, ''));

    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon', r.proname, r.id_args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated, service_role', r.proname, r.id_args);
  END LOOP;
END $$;

-- 3) Community public profile: only authors with an approved/winner article (or yourself).
CREATE OR REPLACE FUNCTION public.get_public_profile(p_user_id uuid)
RETURNS TABLE(id uuid, full_name text, avatar_url text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.avatar_url, p.created_at
  FROM public.profiles p
  WHERE p.id = p_user_id
    AND (
      p.id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.user_article_submissions s
        WHERE s.user_id = p.id AND s.status IN ('approved', 'winner')
      )
    );
$$;