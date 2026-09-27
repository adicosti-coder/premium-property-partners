DO $$
DECLARE
  r record;
  public_allow text[] := ARRAY[
    'has_role','has_valid_admin_mfa',
    'check_poi_review_rate_limit','check_cta_rate_limit','check_appointment_phone_rate_limit','poi_review_content_is_clean',
    'get_analysis_by_token','get_public_poi_reviews','get_public_property_reviews','get_public_profile',
    'get_shared_comparison','get_shared_poi_link','get_poi_review_throttle','get_sitemap_status',
    'log_404','log_analysis_version','submit_analysis_lead','submit_property_review',
    'increment_article_view_count','get_premium_article_slugs'
  ];
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
      AND p.prokind = 'f'
  LOOP
    IF NOT (r.proname = ANY(public_allow)) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', r.sig);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
    END IF;
  END LOOP;
END $$;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;