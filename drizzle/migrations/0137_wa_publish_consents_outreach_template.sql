ALTER TABLE public.wa_publish_consents
  ADD COLUMN IF NOT EXISTS request_template text,
  ADD COLUMN IF NOT EXISTS consent_trigger text;
COMMENT ON COLUMN public.wa_publish_consents.request_template IS 'Meta template confirmed by the Make receipt for this consent request (e.g. outreach_proprietar_butoane_v1).';
COMMENT ON COLUMN public.wa_publish_consents.consent_trigger IS 'How consent was given: outreach_button, outreach_text or text.';
COMMENT ON COLUMN public.wa_publish_consents.status IS 'requested | pending_approval (owner said yes, waiting admin 1/2) | granted | published | rejected | revoked';