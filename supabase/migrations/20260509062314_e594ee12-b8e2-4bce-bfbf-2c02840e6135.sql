
ALTER TABLE public.e2e_test_runs
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parent_run_id BIGINT REFERENCES public.e2e_test_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS retry_scheduled_at TIMESTAMPTZ;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Block non-admin writes e2e_test_runs' AND polrelid='public.e2e_test_runs'::regclass
  ) THEN
    EXECUTE 'CREATE POLICY "Block non-admin writes e2e_test_runs" ON public.e2e_test_runs FOR ALL TO authenticated USING (has_role(auth.uid(), ''admin''::app_role)) WITH CHECK (has_role(auth.uid(), ''admin''::app_role))';
  END IF;
END $$;
