
-- Create a trigger function to call the lead-webhook edge function for high-score leads
CREATE OR REPLACE FUNCTION public.notify_high_score_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sim_data jsonb;
  scor_val int;
  edge_url text;
BEGIN
  -- Parse simulation_data
  sim_data := CASE 
    WHEN NEW.simulation_data IS NOT NULL THEN NEW.simulation_data::jsonb
    ELSE NULL
  END;
  
  IF sim_data IS NULL THEN
    RETURN NEW;
  END IF;
  
  scor_val := COALESCE((sim_data->>'scor')::int, 0);
  
  -- Only trigger for high scores
  IF scor_val >= 90 THEN
    -- Use pg_net to call the edge function asynchronously
    PERFORM net.http_post(
      url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/lead-webhook',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object('record', row_to_json(NEW)::jsonb)
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create the trigger on leads table
DROP TRIGGER IF EXISTS trigger_high_score_lead_webhook ON public.leads;
CREATE TRIGGER trigger_high_score_lead_webhook
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_high_score_lead();
