
ALTER TABLE public.scraper_search_keywords
  ADD COLUMN IF NOT EXISTS success_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fail_count    INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_success_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_zero_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consecutive_zero INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_disabled_reason TEXT;

CREATE OR REPLACE FUNCTION public.record_keyword_outcome(
  _platform TEXT,
  _keyword  TEXT,
  _found    INT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _found > 0 THEN
    UPDATE public.scraper_search_keywords
       SET success_count = success_count + 1,
           last_success_at = now(),
           consecutive_zero = 0,
           updated_at = now()
     WHERE platform IS NOT DISTINCT FROM _platform
       AND keyword  = _keyword;
  ELSE
    UPDATE public.scraper_search_keywords
       SET fail_count = fail_count + 1,
           last_zero_at = now(),
           consecutive_zero = consecutive_zero + 1,
           is_active = CASE
             WHEN consecutive_zero + 1 >= 15 THEN FALSE
             ELSE is_active
           END,
           auto_disabled_reason = CASE
             WHEN consecutive_zero + 1 >= 15
               THEN 'auto-disabled: 15 consecutive zero-result scans'
             ELSE auto_disabled_reason
           END,
           updated_at = now()
     WHERE platform IS NOT DISTINCT FROM _platform
       AND keyword  = _keyword;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_keyword_outcome(TEXT, TEXT, INT) TO service_role, authenticated;
