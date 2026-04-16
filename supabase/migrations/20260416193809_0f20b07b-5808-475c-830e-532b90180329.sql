create table public.seo_audits (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  page_type text,
  language text not null default 'ro',
  overall_score integer,
  title text,
  meta_description text,
  h1_count integer,
  word_count integer,
  suggested_title text,
  suggested_meta text,
  keyword_gaps jsonb default '[]'::jsonb,
  strengths jsonb default '[]'::jsonb,
  issues jsonb default '[]'::jsonb,
  opportunities jsonb default '[]'::jsonb,
  raw_analysis jsonb,
  content_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index seo_audits_url_idx on public.seo_audits(url);
create index seo_audits_created_idx on public.seo_audits(created_at desc);
create index seo_audits_hash_idx on public.seo_audits(content_hash);

alter table public.seo_audits enable row level security;

create policy "Admins manage seo_audits"
  on public.seo_audits for all
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

create policy "Service role manages seo_audits"
  on public.seo_audits for all
  to service_role
  using (true) with check (true);

create trigger seo_audits_updated_at
  before update on public.seo_audits
  for each row execute function public.update_updated_at_column();