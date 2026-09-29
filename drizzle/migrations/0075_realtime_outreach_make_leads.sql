do $$ begin
  begin alter publication supabase_realtime add table public.wa_outbound_queue; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.make_relay_dlq; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.leads; exception when duplicate_object then null; end;
end $$;