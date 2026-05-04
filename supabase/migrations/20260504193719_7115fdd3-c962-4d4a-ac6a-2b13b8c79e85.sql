
-- Audit log for voice caller profile manual/system actions
CREATE TABLE IF NOT EXISTS public.voice_caller_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.voice_caller_profiles(id) ON DELETE SET NULL,
  phone_normalized TEXT,
  action TEXT NOT NULL, -- 'reset', 'archive', 'reactivate', 'gdpr_delete', 'auto_archive', 'manual_edit'
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_label TEXT, -- 'admin' | 'system' | 'cron'
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vca_log_created ON public.voice_caller_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vca_log_profile ON public.voice_caller_audit_log (profile_id);

ALTER TABLE public.voice_caller_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view voice audit log"
  ON public.voice_caller_audit_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert voice audit log"
  ON public.voice_caller_audit_log FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Service role can also write (for edge functions / cron)
CREATE POLICY "Service can insert voice audit log"
  ON public.voice_caller_audit_log FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Latency metrics for memory lookup
CREATE TABLE IF NOT EXISTS public.voice_memory_lookup_metrics (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT,
  phone_normalized TEXT,
  turn INT,
  lookup_ms INT NOT NULL,
  hit BOOLEAN NOT NULL DEFAULT false,
  is_slow BOOLEAN GENERATED ALWAYS AS (lookup_ms > 200) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vmlm_created ON public.voice_memory_lookup_metrics (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vmlm_slow ON public.voice_memory_lookup_metrics (is_slow) WHERE is_slow = true;

ALTER TABLE public.voice_memory_lookup_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view memory metrics"
  ON public.voice_memory_lookup_metrics FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service inserts memory metrics"
  ON public.voice_memory_lookup_metrics FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Update auto-archive cron to write audit entry
CREATE OR REPLACE FUNCTION public.voice_caller_archive_stale()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  WITH archived AS (
    UPDATE public.voice_caller_profiles
       SET archived_at = now()
     WHERE archived_at IS NULL
       AND COALESCE(last_call_at, created_at) < now() - interval '6 months'
    RETURNING id, phone_normalized
  ),
  logged AS (
    INSERT INTO public.voice_caller_audit_log (profile_id, phone_normalized, action, actor_label, details)
    SELECT id, phone_normalized, 'auto_archive', 'cron',
           jsonb_build_object('reason', 'inactive_6_months')
    FROM archived
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM logged;
  RETURN v_count;
END;
$$;
