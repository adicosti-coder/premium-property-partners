
-- 1. wa_conversations
CREATE TABLE public.wa_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_normalized TEXT NOT NULL UNIQUE,
  prospect_id UUID NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','awaiting_human','escalated_to_call','closed')),
  assigned_channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (assigned_channel IN ('whatsapp','voice')),
  last_inbound_at TIMESTAMPTZ NULL,
  last_outbound_at TIMESTAMPTZ NULL,
  window_expires_at TIMESTAMPTZ NULL,
  qualification_score INT NULL,
  handoff_reason TEXT NULL,
  wa_profile_name TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wa_conv_last_inbound ON public.wa_conversations (last_inbound_at DESC NULLS LAST);
CREATE INDEX idx_wa_conv_status ON public.wa_conversations (status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wa_conversations TO authenticated;
GRANT ALL ON public.wa_conversations TO service_role;
ALTER TABLE public.wa_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage wa conversations" ON public.wa_conversations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. wa_messages
CREATE TABLE public.wa_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.wa_conversations(id) ON DELETE CASCADE,
  wa_message_id TEXT NULL UNIQUE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  content TEXT NOT NULL DEFAULT '',
  media_url TEXT NULL,
  template_name TEXT NULL,
  ai_model TEXT NULL,
  ai_tokens_in INT NULL,
  ai_tokens_out INT NULL,
  tool_call JSONB NULL,
  error TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wa_msg_conv_created ON public.wa_messages (conversation_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wa_messages TO authenticated;
GRANT ALL ON public.wa_messages TO service_role;
ALTER TABLE public.wa_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage wa messages" ON public.wa_messages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. wa_agent_settings (singleton)
CREATE TABLE public.wa_agent_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled BOOLEAN NOT NULL DEFAULT false,
  system_prompt TEXT NOT NULL DEFAULT '',
  escalation_threshold INT NOT NULL DEFAULT 70,
  office_hours_only BOOLEAN NOT NULL DEFAULT false,
  paused_reason TEXT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.wa_agent_settings TO authenticated;
GRANT ALL ON public.wa_agent_settings TO service_role;
ALTER TABLE public.wa_agent_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read wa settings" ON public.wa_agent_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update wa settings" ON public.wa_agent_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default settings row
INSERT INTO public.wa_agent_settings (id, enabled, system_prompt, escalation_threshold, office_hours_only)
VALUES (
  1,
  false,
  'Ești Andrei, consultant senior la RealTrust Timișoara — agenție specializată în proprietăți investiționale în regim hotelier. Vorbești pe WhatsApp cu proprietari care ne-au fost recomandați sau ne-au contactat.

STIL:
- Scurt, natural, prietenos. Fără emoji excesiv (max 1 per mesaj).
- Un singur subiect / mesaj. Nu bombarda cu întrebări.
- Româna corectă, adresare cu "dumneavoastră" până când proprietarul spune altfel.
- NU inventa date despre proprietate. Dacă nu știi, întreabă.

OBIECTIVE (în ordine):
1. Confirmă că vorbești cu proprietarul apartamentului (zonă, cameră/e, suprafață).
2. Calificare: preț așteptat, disponibilitate, deschidere pentru regim hotelier gestionat de RealTrust (ROI 9.4% net) vs. închiriere clasică / vânzare.
3. Când lead-ul e cald și clar (răspunsuri clare, buget definit, deschis să discute), folosește tool-ul escalate_to_call pentru a-l suna Andrei în persoană.
4. Dacă cere detalii tehnice complexe (contracte, comision, plăți) → folosește handoff_human.

CONSTRÂNGERI:
- Business locație: Timișoara (jud. Timiș). Zone: Cetate, Iosefin, Fabric, Dumbrăvița, Aradului. NU București.
- Randament standard comunicat: 9.4% net anual, ocupare medie 75%, deducere management+taxe ~27%.
- Nu promite prețuri sau comisioane fără confirmarea unui om.',
  70,
  false
);

-- 4. Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_messages;

ALTER TABLE public.wa_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.wa_messages REPLICA IDENTITY FULL;

-- 5. updated_at trigger for wa_conversations
CREATE TRIGGER trg_wa_conv_updated_at
  BEFORE UPDATE ON public.wa_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
