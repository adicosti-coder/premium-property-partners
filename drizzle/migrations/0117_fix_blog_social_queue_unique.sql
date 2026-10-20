CREATE OR REPLACE FUNCTION public.queue_blog_social_posts()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  url text := 'https://realtrust.ro/blog/' || new.slug;
  img text := coalesce(nullif(new.main_image_url,''), nullif(new.cover_image,''), '');
  cap text := new.title || E'\n\n' || coalesce(new.excerpt, '');
  mt text; su text;
begin
  if not new.is_published or (tg_op = 'UPDATE' and old.is_published) then return new; end if;
  foreach mt in array array['IMAGE','STORY'] loop
    su := case when mt = 'STORY' then url || '#story' else url end;
    insert into social_posts (type, title, source_url, image_url, caption, status, scheduled_at, media_type, story_link_url, user_id)
    values ('blog', new.title, su, img, cap, 'scheduled', now(), mt, case when mt = 'STORY' then url end, null)
    on conflict (source_url) do nothing;
  end loop;
  return new;
end $function$;