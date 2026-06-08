-- Anti-regression alert: when auto-publish-listings fails 3+ times in a row, notify admins
CREATE OR REPLACE FUNCTION public.notify_auto_publish_regression()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent_statuses TEXT[];
  v_all_failed BOOLEAN;
  v_admin RECORD;
  v_recent_dup INT;
  v_err TEXT;
BEGIN
  -- Only react when this row is a finalized failure for the target job
  IF NEW.job_key <> 'auto-publish-listings' THEN
    RETURN NEW;
  END IF;
  IF NEW.status NOT IN ('failed', 'timeout') THEN
    RETURN NEW;
  END IF;
  IF NEW.finished_at IS NULL THEN
    RETURN NEW;
  END IF;

  -- Pull last 3 finalized runs for this job (success / failed / timeout)
  SELECT array_agg(status ORDER BY started_at DESC)
    INTO v_recent_statuses
  FROM (
    SELECT status, started_at
    FROM public.automation_runs
    WHERE job_key = 'auto-publish-listings'
      AND status IN ('success', 'failed', 'timeout')
    ORDER BY started_at DESC
    LIMIT 3
  ) t;

  IF v_recent_statuses IS NULL OR array_length(v_recent_statuses, 1) < 3 THEN
    RETURN NEW;
  END IF;

  v_all_failed := NOT ('success' = ANY (v_recent_statuses));
  IF NOT v_all_failed THEN
    RETURN NEW;
  END IF;

  v_err := COALESCE(NULLIF(NEW.error, ''), 'Eroare necunoscută. Verifică logurile.');
  IF length(v_err) > 500 THEN
    v_err := left(v_err, 500) || '…';
  END IF;

  -- For each admin / super_admin, insert one notification (dedup: skip if a similar
  -- unread notification was created in the last hour)
  FOR v_admin IN
    SELECT DISTINCT user_id
    FROM public.user_roles
    WHERE role IN ('admin', 'super_admin')
  LOOP
    SELECT count(*) INTO v_recent_dup
    FROM public.user_notifications
    WHERE user_id = v_admin.user_id
      AND title LIKE '🚨 Alertă anti-regresie%'
      AND is_read = false
      AND created_at > now() - interval '1 hour';

    IF v_recent_dup = 0 THEN
      INSERT INTO public.user_notifications
        (user_id, title, message, type, action_url, action_label)
      VALUES (
        v_admin.user_id,
        '🚨 Alertă anti-regresie: auto-publish-listings eșuat',
        '3 rulări consecutive eșuate pentru job-ul auto-publish-listings. Ultima eroare: ' || v_err,
        'warning',
        '/admin?tab=voice-agent&sub=cron-monitor',
        'Vezi Cron Monitor'
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_auto_publish_regression ON public.automation_runs;
CREATE TRIGGER trg_notify_auto_publish_regression
AFTER INSERT OR UPDATE OF status, finished_at ON public.automation_runs
FOR EACH ROW
EXECUTE FUNCTION public.notify_auto_publish_regression();