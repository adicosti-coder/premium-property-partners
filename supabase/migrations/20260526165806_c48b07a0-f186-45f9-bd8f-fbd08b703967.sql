
UPDATE public.prospect_listings
SET is_active = false,
    lifecycle_status = 'rejected',
    next_callback_at = NULL,
    last_failure_reason = COALESCE(last_failure_reason, 'aggregator_index_page')
WHERE (
  title ~* '^\s*\d{1,3}([.,\s]\d{3})*\s+(apartamente|propriet[ăa][țt]i|case|garsoniere|vile|imobile|anun[țt]uri)\b'
  OR (source_url ~* '(trovit\.|/category/|/cauta|/search|/list($|\?))'
      AND source_url !~* '/ad/|/anunt|/oferta')
)
AND is_active = true;
