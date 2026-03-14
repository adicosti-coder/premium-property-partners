-- Update the trigger function to include webhook secret in headers
CREATE OR REPLACE FUNCTION public.notify_high_score_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sim_data jsonb;
  scor_val int;
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
    -- Call the edge function with webhook secret header
    PERFORM net.http_post(
      url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/lead-webhook',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', 'Secret_Leads_2024_!_Sec'
      ),
      body := jsonb_build_object('record', row_to_json(NEW)::jsonb)
    );
  END IF;
  
  RETURN NEW;
END;
$function$;