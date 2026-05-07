
-- 1) Setări mai agresive pentru autopilot
UPDATE voice_agent_settings SET
  min_lead_score = 50,
  autopilot_max_per_tick = 15,
  max_calls_per_day = 100,
  autopilot_enabled = true,
  auto_dial_enabled = true
WHERE id = 1;

-- 2) Normalizare telefoane RO la E.164 acolo unde lipsește phone_normalized
UPDATE prospect_listings SET phone_normalized = (
  CASE
    WHEN regexp_replace(contact_phone, '[^0-9+]', '', 'g') ~ '^\+40[0-9]{9}$'
      THEN regexp_replace(contact_phone, '[^0-9+]', '', 'g')
    WHEN regexp_replace(contact_phone, '[^0-9]', '', 'g') ~ '^40[0-9]{9}$'
      THEN '+' || regexp_replace(contact_phone, '[^0-9]', '', 'g')
    WHEN regexp_replace(contact_phone, '[^0-9]', '', 'g') ~ '^0[0-9]{9}$'
      THEN '+4' || regexp_replace(contact_phone, '[^0-9]', '', 'g')
    ELSE NULL
  END
)
WHERE phone_normalized IS NULL
  AND contact_phone IS NOT NULL
  AND length(regexp_replace(contact_phone, '[^0-9]', '', 'g')) BETWEEN 9 AND 12;

-- 3) Reactivează prospectele blocate în pending_credentials / failed pentru retry (acum că Twilio e configurat)
UPDATE prospect_listings SET
  lifecycle_status = 'new',
  auto_call_triggered_at = NULL,
  retry_count = 0,
  voice_call_session_id = NULL
WHERE lifecycle_status IN ('pending_credentials','calling')
  AND phone_normalized IS NOT NULL;

-- 4) Reset retry pentru leads failed cu telefon valid și mai puțin de 3 încercări
UPDATE prospect_listings SET
  lifecycle_status = 'new',
  auto_call_triggered_at = NULL,
  retry_count = 0
WHERE lifecycle_status = 'failed'
  AND phone_normalized IS NOT NULL
  AND COALESCE(retry_count, 0) < 3
  AND COALESCE(last_failure_reason, '') NOT ILIKE '%invalid_phone%'
  AND COALESCE(last_failure_reason, '') NOT ILIKE '%generic_search%';
