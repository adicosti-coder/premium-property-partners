UPDATE public.prospect_listings p SET
  dismissed_at = now(),
  dismissed_reason = 'inactive_no_phone_14d',
  dismissed_prev = jsonb_build_object(
    'is_active', p.is_active, 'lifecycle_status', p.lifecycle_status,
    'outreach_status', p.outreach_status, 'outreach_scheduled_at', p.outreach_scheduled_at,
    'outreach_error', p.outreach_error,
    'wa_queue_ids', '[]'::jsonb, 'owner_outreach', '[]'::jsonb, 'ghost_ids', '[]'::jsonb)
WHERE p.dismissed_at IS NULL
  AND p.is_active = false
  AND coalesce(nullif(btrim(p.contact_phone),''), nullif(btrim(p.phone_normalized),'')) IS NULL
  AND greatest(coalesce(p.last_seen_at,'-infinity'), coalesce(p.scraped_at,'-infinity'), p.created_at) < now() - interval '14 days';