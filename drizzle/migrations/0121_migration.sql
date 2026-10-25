create table public.agent_prompts_history (
  id uuid primary key default gen_random_uuid(),
  script_id uuid not null references public.voice_agent_scripts(id) on delete cascade,
  current_prompt text not null,
  proposed_prompt text not null,
  reasoning text not null,
  evidence jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_by uuid,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index agent_prompts_one_pending on public.agent_prompts_history(script_id) where status='pending';
alter table public.agent_prompts_history enable row level security;
grant select on public.agent_prompts_history to authenticated;
grant all on public.agent_prompts_history to service_role;
create policy "admins read prompt proposals" on public.agent_prompts_history for select to authenticated using (public.has_role(auth.uid(),'admin'));

create or replace function public.review_agent_prompt(_id uuid, _approve boolean)
returns text language plpgsql security definer set search_path = public as $$
declare r public.agent_prompts_history; s public.voice_agent_scripts; v int;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Admin only'; end if;
  select * into r from public.agent_prompts_history where id=_id for update;
  if r.id is null or r.status <> 'pending' then raise exception 'Propunerea nu mai este în așteptare'; end if;
  if not _approve then
    update public.agent_prompts_history set status='rejected', reviewed_by=auth.uid(), reviewed_at=now() where id=_id;
    return 'rejected';
  end if;
  select * into s from public.voice_agent_scripts where id=r.script_id for update;
  if s.system_prompt is distinct from r.current_prompt then
    raise exception 'Promptul curent s-a schimbat între timp; rulați din nou re-antrenarea';
  end if;
  select coalesce(max(version_number),0)+1 into v from public.voice_agent_script_versions where script_id=s.id;
  insert into public.voice_agent_script_versions(script_id, version_number, name, system_prompt, notes, language, created_by)
    values (s.id, v, s.name, s.system_prompt, 'Înainte de auto-optimizare ' || _id, s.language, auth.uid());
  update public.voice_agent_scripts set system_prompt=r.proposed_prompt, updated_at=now() where id=s.id;
  update public.agent_prompts_history set status='approved', reviewed_by=auth.uid(), reviewed_at=now() where id=_id;
  return 'approved';
end $$;
revoke all on function public.review_agent_prompt(uuid,boolean) from public, anon;
grant execute on function public.review_agent_prompt(uuid,boolean) to authenticated;