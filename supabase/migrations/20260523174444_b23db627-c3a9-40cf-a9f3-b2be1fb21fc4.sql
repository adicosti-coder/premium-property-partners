ALTER TABLE public.automation_jobs DROP CONSTRAINT IF EXISTS automation_jobs_category_check;
ALTER TABLE public.automation_jobs ADD CONSTRAINT automation_jobs_category_check CHECK (category = ANY (ARRAY['lead','seo','system','blog','ai','listing']));

UPDATE public.automation_jobs SET category = 'listing' WHERE job_key IN ('auto-publish-listings','listing-import-self-heal');

INSERT INTO public.automation_jobs (job_key, label, category, schedule, trigger_type, enabled, description, config)
VALUES
  ('listing.compile_prompt', 'Listing Import · Compile System Prompt', 'listing', '0 3 * * *', 'cron', true,
   'Consolidează lecțiile învățate în prompt-ul de sistem AI pentru rescrierea anunțurilor.',
   '{"timeout_ms":40000}'::jsonb),
  ('listing.learn', 'Listing Import · Continuous Learning (event)', 'listing', NULL, 'event', true,
   'Analizează diff-ul AI vs final după revizuirea unui anunț în FastReview.',
   '{}'::jsonb)
ON CONFLICT (job_key) DO UPDATE
SET label = EXCLUDED.label,
    category = EXCLUDED.category,
    schedule = EXCLUDED.schedule,
    trigger_type = EXCLUDED.trigger_type,
    description = EXCLUDED.description,
    updated_at = now();