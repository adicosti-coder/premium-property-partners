delete from public.lead_events where lead_id in (select id from public.leads where source='audit_test');
delete from public.leads where source='audit_test';