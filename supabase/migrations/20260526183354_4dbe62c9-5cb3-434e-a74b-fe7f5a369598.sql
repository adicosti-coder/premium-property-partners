
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='suppressed_emails' AND policyname='Admins can read suppressed emails'
  ) THEN
    EXECUTE 'GRANT SELECT ON public.suppressed_emails TO authenticated';
    EXECUTE $POL$
      CREATE POLICY "Admins can read suppressed emails"
      ON public.suppressed_emails
      FOR SELECT
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::public.app_role))
    $POL$;
  END IF;
END $$;
