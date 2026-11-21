REVOKE EXECUTE ON FUNCTION public.automation_live_logs_cleanup(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.automation_runs_cleanup(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.automation_live_logs_cleanup(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.automation_runs_cleanup(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.submit_property_review(_property_id uuid, _guest_name text, _content text, _rating numeric, _guest_email text DEFAULT NULL::text, _title text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _id uuid;
  _secret text;
begin
  if _rating is null or _rating < 1 or _rating > 5 then
    raise exception 'INVALID_RATING';
  end if;
  if _guest_name is null or length(trim(_guest_name)) < 2 then
    raise exception 'INVALID_NAME';
  end if;
  if _content is null or length(trim(_content)) < 10 then
    raise exception 'INVALID_CONTENT';
  end if;
  if _guest_email is not null and _guest_email <> ''
     and _guest_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'INVALID_EMAIL';
  end if;

  insert into public.property_reviews (
    property_id, guest_name, guest_email, title, content, rating, is_published
  ) values (
    _property_id,
    left(trim(_guest_name), 120),
    nullif(trim(coalesce(_guest_email, '')), ''),
    nullif(left(trim(coalesce(_title, '')), 200), ''),
    left(trim(_content), 4000),
    _rating,
    false
  )
  returning id into _id;

  -- Staff notification is dispatched server-side for this exact review only;
  -- the notification function accepts internal calls only.
  begin
    _secret := public.get_cron_reconcile_secret();
    if _secret is not null and _secret <> '' then
      perform net.http_post(
        url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/send-review-notification',
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', _secret),
        body := jsonb_build_object('reviewId', _id)
      );
    end if;
  exception when others then
    null;
  end;

  return _id;
end;
$function$;