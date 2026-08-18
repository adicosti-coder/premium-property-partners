update public.wa_agent_settings set enabled = false where id = 1;
delete from public.wa_messages where conversation_id in (select id from public.wa_conversations where phone_normalized = '+40700000001');
delete from public.wa_conversations where phone_normalized = '+40700000001';