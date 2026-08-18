update public.wa_agent_settings set enabled = true where id = 1;
update public.wa_conversations set last_outbound_at = now() where phone_normalized = '+40700000001';