CREATE OR REPLACE FUNCTION public.system_e2e_lead_probe()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'net'
AS $$
DECLARE
  v_score int; v_grade text; v_id uuid; v_before bigint; v_after bigint := 0; v_urls text[];
BEGIN
  SELECT coalesce(max(id), 0) INTO v_before FROM net.http_request_queue;
  -- Subtransaction: insert a synthetic Calculator lead, observe triggers, then roll back
  -- everything (lead row + queued HTTP calls) so no real WhatsApp/CRM message is sent.
  BEGIN
    INSERT INTO public.leads (name, whatsapp_number, property_area, property_type, calculated_net_profit,
      calculated_yearly_profit, source, simulation_data)
    VALUES ('TEST E2E SISTEM', '0799000111', 55, '2 camere', 650, 7800, 'calculator_roi_widget',
      jsonb_build_object('zona', 'Cetate', 'camere', '2 camere', 'e2e_probe', true))
    RETURNING id, lead_score, lead_grade INTO v_id, v_score, v_grade;
    SELECT count(*), array_agg(DISTINCT regexp_replace(url, '^.*/functions/v1/', ''))
      INTO v_after, v_urls FROM net.http_request_queue WHERE id > v_before;
    RAISE EXCEPTION 'e2e_rollback';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'e2e_rollback' THEN
      RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
    END IF;
  END;
  RETURN jsonb_build_object('ok', v_id IS NOT NULL, 'lead_inserted', v_id IS NOT NULL, 'score', v_score,
    'grade', v_grade, 'queued_webhooks', v_after, 'webhook_targets', coalesce(v_urls, ARRAY[]::text[]), 'rolled_back', true);
END;
$$;
REVOKE ALL ON FUNCTION public.system_e2e_lead_probe() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_e2e_lead_probe() TO service_role;