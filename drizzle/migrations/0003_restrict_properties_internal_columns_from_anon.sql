-- Hide internal/operational columns of public.properties from anonymous visitors.
-- Public listing pages only need marketing/commercial fields; scraping provenance,
-- AI quality scores and import bookkeeping stay admin-only (authenticated + service_role).
DO $$
DECLARE
  internal_cols text[] := ARRAY[
    'source_url','source_platform','original_source_url','original_description_raw',
    'import_source','imported_at','needs_review','sanitization_log',
    'migrated_from_prospect_id','quality_score','review_action','reviewed_at',
    'images_processing_status','images_processing_log','images_processed_at',
    'indexing_status','last_google_check_at'
  ];
  public_cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
    INTO public_cols
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'properties'
    AND NOT (column_name = ANY (internal_cols));

  REVOKE SELECT ON public.properties FROM anon;
  EXECUTE format('GRANT SELECT (%s) ON public.properties TO anon', public_cols);
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO authenticated;
GRANT ALL ON public.properties TO service_role;