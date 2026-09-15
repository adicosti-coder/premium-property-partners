-- Agenți reali pentru conversațiile WhatsApp (alocare + backup pe e-mail).
CREATE TABLE IF NOT EXISTS public.wa_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone_normalized text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.wa_agents TO authenticated;
GRANT ALL ON public.wa_agents TO service_role;

ALTER TABLE public.wa_agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage wa agents" ON public.wa_agents;
CREATE POLICY "Admins manage wa agents" ON public.wa_agents
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.wa_conversations
  ADD COLUMN IF NOT EXISTS assigned_agent_id uuid REFERENCES public.wa_agents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_wa_conversations_assigned_agent
  ON public.wa_conversations (assigned_agent_id);

INSERT INTO public.wa_agents (name, email)
SELECT 'Adrian Costi', 'info@realtrust.ro'
WHERE NOT EXISTS (SELECT 1 FROM public.wa_agents);

-- Alocare echilibrată: agentul activ cu cele mai puține conversații deschise.
CREATE OR REPLACE FUNCTION public.wa_assign_agent(_conversation_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _agent uuid;
  _existing uuid;
BEGIN
  SELECT assigned_agent_id INTO _existing
  FROM public.wa_conversations WHERE id = _conversation_id;
  IF _existing IS NOT NULL THEN
    RETURN _existing;
  END IF;

  SELECT a.id INTO _agent
  FROM public.wa_agents a
  LEFT JOIN public.wa_conversations c
    ON c.assigned_agent_id = a.id
   AND coalesce(c.status, 'open') NOT IN ('closed', 'opted_out')
  WHERE a.is_active
  GROUP BY a.id, a.created_at
  ORDER BY count(c.id) ASC, a.created_at ASC
  LIMIT 1;

  IF _agent IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.wa_conversations
     SET assigned_agent_id = _agent, assigned_at = now()
   WHERE id = _conversation_id;

  RETURN _agent;
END;
$$;

REVOKE ALL ON FUNCTION public.wa_assign_agent(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wa_assign_agent(uuid) TO service_role;