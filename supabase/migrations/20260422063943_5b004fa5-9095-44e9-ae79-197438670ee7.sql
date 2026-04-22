-- Trigger: send WhatsApp alert on every new lead
CREATE OR REPLACE FUNCTION public.notify_new_lead_whatsapp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/notify-new-lead-whatsapp',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', 'Secret_Leads_2024_!_Sec'
    ),
    body := jsonb_build_object('record', row_to_json(NEW)::jsonb)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the insert if the webhook fails
  RAISE WARNING 'notify_new_lead_whatsapp failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_lead_whatsapp ON public.leads;
CREATE TRIGGER trg_notify_new_lead_whatsapp
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_lead_whatsapp();