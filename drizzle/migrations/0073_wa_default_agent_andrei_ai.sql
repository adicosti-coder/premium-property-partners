INSERT INTO public.wa_agents (id, name, email, is_active)
VALUES ('a0d7e1a1-0000-4000-8000-00000000a1a1', 'Andrei AI', 'andrei.ai@realtrust.ro', true)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.wa_conversations_default_agent()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.assigned_agent_id IS NULL THEN
    NEW.assigned_agent_id := 'a0d7e1a1-0000-4000-8000-00000000a1a1'::uuid;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_wa_conversations_default_agent ON public.wa_conversations;
CREATE TRIGGER trg_wa_conversations_default_agent
BEFORE INSERT ON public.wa_conversations
FOR EACH ROW EXECUTE FUNCTION public.wa_conversations_default_agent();

UPDATE public.wa_conversations SET assigned_agent_id = 'a0d7e1a1-0000-4000-8000-00000000a1a1'
WHERE assigned_agent_id IS NULL;