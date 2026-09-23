-- Anon guests can insert reviews but cannot SELECT them (restrictive deny policy),
-- so INSERT ... RETURNING via PostgREST fails. This SECURITY DEFINER RPC inserts
-- the review and returns only its id, keeping reads locked down.
create or replace function public.submit_property_review(
  _property_id uuid,
  _guest_name text,
  _content text,
  _rating numeric,
  _guest_email text default null,
  _title text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _id uuid;
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

  return _id;
end;
$$;

revoke all on function public.submit_property_review(uuid, text, text, numeric, text, text) from public;
grant execute on function public.submit_property_review(uuid, text, text, numeric, text, text) to anon, authenticated;