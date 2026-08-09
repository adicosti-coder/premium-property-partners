DO $$
DECLARE
  cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ')
    INTO cols
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'properties'
     AND column_name NOT IN (
       'original_source_url',
       'original_description_raw',
       'sanitization_log',
       'migrated_from_prospect_id'
     );

  EXECUTE 'REVOKE SELECT ON public.properties FROM anon';
  EXECUTE format('GRANT SELECT (%s) ON public.properties TO anon', cols);
END;
$$;
