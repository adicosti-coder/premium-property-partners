
-- Memorie persistentă per apelant (cheie: phone_normalized)
CREATE TABLE public.voice_caller_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_normalized text NOT NULL UNIQUE,
  display_name text,
  -- Preferințe extrase agregat
  preferred_branch text, -- 'vanzare' | 'inchiriere' | 'cazare'
  budget_min numeric,
  budget_max numeric,
  preferred_zones text[] DEFAULT '{}',
  property_types text[] DEFAULT '{}',
  timeline text, -- 'urgent' | '1-3 luni' | '3-6 luni' | 'explorare'
  rooms_min int,
  rooms_max int,
  -- Memorie liberă (rezumat conversațional + ID-uri propr. menționate)
  notes text,
  mentioned_property_ids uuid[] DEFAULT '{}',
  consent_remember boolean NOT NULL DEFAULT true,
  call_count int NOT NULL DEFAULT 0,
  last_call_at timestamptz,
  last_session_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_voice_caller_profiles_phone ON public.voice_caller_profiles(phone_normalized);

ALTER TABLE public.voice_caller_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage caller profiles"
ON public.voice_caller_profiles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_voice_caller_profiles_updated
BEFORE UPDATE ON public.voice_caller_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Context viu (entități extrase în-apel) pe sesiune
ALTER TABLE public.voice_call_sessions
  ADD COLUMN IF NOT EXISTS extracted_entities jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS caller_profile_id uuid REFERENCES public.voice_caller_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_voice_call_sessions_caller_profile ON public.voice_call_sessions(caller_profile_id);
