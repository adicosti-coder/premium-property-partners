
CREATE OR REPLACE FUNCTION public.notify_new_lead_whatsapp()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE service_key text;
BEGIN
  BEGIN service_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN service_key := NULL; END;
  PERFORM net.http_post(
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/notify-new-lead-whatsapp',
    headers := jsonb_build_object('Content-Type','application/json','x-webhook-secret', coalesce(service_key,'')),
    body := jsonb_build_object('record', row_to_json(NEW)::jsonb)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_new_lead_whatsapp failed: %', SQLERRM;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.notify_high_score_lead()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE sim_data jsonb; scor_val int; service_key text;
BEGIN
  sim_data := CASE WHEN NEW.simulation_data IS NOT NULL THEN NEW.simulation_data::jsonb ELSE NULL END;
  IF sim_data IS NULL THEN RETURN NEW; END IF;
  scor_val := COALESCE((sim_data->>'scor')::int, 0);
  IF scor_val >= 90 THEN
    BEGIN service_key := current_setting('app.settings.service_role_key', true);
    EXCEPTION WHEN OTHERS THEN service_key := NULL; END;
    PERFORM net.http_post(
      url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/lead-webhook',
      headers := jsonb_build_object('Content-Type','application/json','x-webhook-secret', coalesce(service_key,'')),
      body := jsonb_build_object('record', row_to_json(NEW)::jsonb)
    );
  END IF;
  RETURN NEW;
END; $function$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Anyone can view saved comparisons' AND polrelid = 'public.saved_comparisons'::regclass) THEN
    EXECUTE 'DROP POLICY "Anyone can view saved comparisons" ON public.saved_comparisons';
  END IF;
END $$;

CREATE POLICY "Anonymous comparisons are publicly viewable"
ON public.saved_comparisons FOR SELECT USING (user_id IS NULL);

CREATE POLICY "Users view their own saved comparisons"
ON public.saved_comparisons FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins view all saved comparisons"
ON public.saved_comparisons FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT polname FROM pg_policy WHERE polrelid='public.guest_guides'::regclass AND polcmd IN ('r','*') LOOP
    EXECUTE format('DROP POLICY %I ON public.guest_guides', r.polname);
  END LOOP;
END $$;

CREATE POLICY "Admins manage guest guides"
ON public.guest_guides FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can view email send log"
ON public.email_send_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can view unsubscribe tokens"
ON public.email_unsubscribe_tokens FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
