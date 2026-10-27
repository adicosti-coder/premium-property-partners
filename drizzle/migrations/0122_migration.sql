create table public.property_sale_offers (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  buyer_label text not null,
  amount_eur numeric(12,2) not null check (amount_eur > 0),
  payment_method text,
  conditions text,
  status text not null default 'primita' check (status in ('primita','acceptata','respinsa','retrasa')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.property_sale_settings (
  property_id uuid primary key references public.properties(id) on delete cascade,
  start_price_eur numeric(12,2),
  min_price_eur numeric(12,2),
  deadline date,
  updated_at timestamptz not null default now()
);
alter table public.property_sale_offers enable row level security;
alter table public.property_sale_settings enable row level security;
grant select, insert, update, delete on public.property_sale_offers to authenticated;
grant select, insert, update, delete on public.property_sale_settings to authenticated;
grant all on public.property_sale_offers, public.property_sale_settings to service_role;

create or replace function public.is_property_owner(_property_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.owner_properties where property_id = _property_id and user_id = auth.uid())
$$;

create policy "owner reads offers" on public.property_sale_offers for select to authenticated
  using (public.is_property_owner(property_id) or public.has_role(auth.uid(),'admin'));
create policy "admin manages offers" on public.property_sale_offers for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "owner reads settings" on public.property_sale_settings for select to authenticated
  using (public.is_property_owner(property_id) or public.has_role(auth.uid(),'admin'));
create policy "owner sets settings" on public.property_sale_settings for insert to authenticated
  with check (public.is_property_owner(property_id) or public.has_role(auth.uid(),'admin'));
create policy "owner updates settings" on public.property_sale_settings for update to authenticated
  using (public.is_property_owner(property_id) or public.has_role(auth.uid(),'admin'))
  with check (public.is_property_owner(property_id) or public.has_role(auth.uid(),'admin'));
create index on public.property_sale_offers(property_id, created_at desc);