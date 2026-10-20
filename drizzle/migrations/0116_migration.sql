create or replace function public.queue_blog_social_posts()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  url text := 'https://realtrust.ro/blog/' || new.slug;
  img text := coalesce(nullif(new.main_image_url,''), nullif(new.cover_image,''), '');
  cap text := new.title || E'\n\n' || coalesce(new.excerpt, '');
  mt text;
begin
  if not new.is_published or (tg_op = 'UPDATE' and old.is_published) then return new; end if;
  foreach mt in array array['IMAGE','STORY'] loop
    if not exists (select 1 from social_posts where source_url = url and media_type = mt) then
      insert into social_posts (type, title, source_url, image_url, caption, status, scheduled_at, media_type, story_link_url, user_id)
      values ('blog', new.title, url, img, cap, 'scheduled', now(), mt, case when mt = 'STORY' then url end, null);
    end if;
  end loop;
  return new;
end $$;

drop trigger if exists trg_queue_blog_social_posts on public.blog_articles;
create trigger trg_queue_blog_social_posts after insert or update of is_published on public.blog_articles
for each row execute function public.queue_blog_social_posts();