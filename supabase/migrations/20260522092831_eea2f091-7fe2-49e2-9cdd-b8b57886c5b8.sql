-- 1. Mark generic-search / non-listing junk as inactive + invalid.
UPDATE public.prospect_listings
   SET is_active = false,
       lifecycle_status = 'failed',
       marked_invalid_at = COALESCE(marked_invalid_at, now()),
       invalid_reason = COALESCE(invalid_reason, 'generic_search_or_non_listing_page'),
       admin_notes = COALESCE(admin_notes, '') || ' [auto-cleanup 2026-05-22: pagină generică/non-anunț]'
 WHERE is_active = true
   AND (
     source_url ~* '(wikipedia\.org|tion\.ro|libertatea\.ro|opiniatimisoarei\.ro|ziuadevest\.ro|stiridetimisoara\.ro|tucamaria\.ro|saint-gobain\.ro|infinity-skyline\.ro|ateneo\.ro|casaldaritanatura\.pt|flatspotter\.com|timisoreni\.ro|hcl\.civicul\.ro|primariatm\.ro|cjtimis\.ro|digi24\.ro|adevarul\.ro|hotnews\.ro)'
     OR source_url ~* '\.(pdf|docx?|xlsx?|zip|rar)(\?|$)'
     OR source_url ~* 'facebook\.com/(groups/\d+/?$|marketplace/[a-z]+/?$|groups/[^/]+/?$)'
     OR source_url ~* 'facebook\.com/marketplace/[^/]+/(propertyforsale|propertyforrent)/?$'
     OR source_url ~* '/(apartamente|garsoniere|case|terenuri)-(de-)?(vanzare|inchiriat|inchirit)/?$'
     OR source_url ~* '/info/apartamente/'
     OR source_url ~* '/tag/'
     OR source_url ~* '/case-study/'
     OR title ~* '(wikipedia|archives|\[pdf\]|hcl |hotararea|primaria|primăria|locatarii|fosta |complexul|case study|matrimoniale|forum)'
   );

-- 2. Re-activate real callable candidates so Andrei picks them up next tick.
UPDATE public.prospect_listings
   SET lifecycle_status = 'new',
       marked_invalid_at = NULL,
       invalid_reason = NULL
 WHERE is_active = true
   AND phone_normalized IS NOT NULL
   AND lead_score >= 50
   AND auto_call_triggered_at IS NULL
   AND do_not_call = false
   AND lifecycle_status NOT IN ('new', 'callback', 'calling', 'interested', 'posted')
   AND source_url ~* '(/d/oferta/|/anunt/|/oferta/|/ad/|facebook\.com/marketplace/item/|facebook\.com/groups/[^/]+/(posts|permalink)/\d+|lajumate\.ro/ad/|publi24\.ro/anunturi/|storia\.ro/ro/oferta/|imobiliare\.ro/oferta-|bursaimobiliara\.ro/.*\.html)';

-- 3. Align autopilot min_lead_score floor.
UPDATE public.voice_agent_settings
   SET min_lead_score = LEAST(COALESCE(min_lead_score, 50), 50)
 WHERE id = 1;