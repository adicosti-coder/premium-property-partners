-- =====================================================
-- AI Chatbot Premium: Conversation Memory & Lead Capture
-- =====================================================

-- Table for storing chat conversations
CREATE TABLE public.chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  language TEXT DEFAULT 'ro',
  lead_qualified BOOLEAN DEFAULT FALSE,
  lead_type TEXT, -- 'guest', 'owner', 'investor'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for storing chat messages
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  tool_name TEXT,
  tool_result JSONB,
  tokens_used INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for scheduled appointments from chatbot
CREATE TABLE public.chatbot_appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  appointment_type TEXT NOT NULL, -- 'viewing', 'evaluation', 'consultation'
  preferred_date TIMESTAMP WITH TIME ZONE,
  preferred_time_slot TEXT, -- 'morning', 'afternoon', 'evening'
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT,
  property_interest TEXT, -- property ID or description
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  webhook_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_appointments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_conversations
-- Users can view their own conversations (by user_id or session_id)
CREATE POLICY "Users can view own conversations" 
ON public.chat_conversations 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR (user_id IS NULL AND session_id IS NOT NULL)
);

-- Anyone can create conversations (for anonymous users)
CREATE POLICY "Anyone can create conversations" 
ON public.chat_conversations 
FOR INSERT 
WITH CHECK (true);

-- Users can update their own conversations
CREATE POLICY "Users can update own conversations" 
ON public.chat_conversations 
FOR UPDATE 
USING (auth.uid() = user_id OR user_id IS NULL);

-- Admins can view all conversations
CREATE POLICY "Admins can view all conversations" 
ON public.chat_conversations 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in their conversations" 
ON public.chat_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.chat_conversations c 
    WHERE c.id = conversation_id 
    AND (c.user_id = auth.uid() OR c.user_id IS NULL)
  )
);

CREATE POLICY "Anyone can insert messages" 
ON public.chat_messages 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view all messages" 
ON public.chat_messages 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for chatbot_appointments
CREATE POLICY "Users can view own appointments" 
ON public.chatbot_appointments 
FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Anyone can create appointments" 
ON public.chatbot_appointments 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update own appointments" 
ON public.chatbot_appointments 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all appointments" 
ON public.chatbot_appointments 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Indexes for performance
CREATE INDEX idx_chat_conversations_user ON public.chat_conversations(user_id);
CREATE INDEX idx_chat_conversations_session ON public.chat_conversations(session_id);
CREATE INDEX idx_chat_conversations_activity ON public.chat_conversations(last_activity_at DESC);
CREATE INDEX idx_chat_messages_conversation ON public.chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_created ON public.chat_messages(created_at DESC);
CREATE INDEX idx_chatbot_appointments_status ON public.chatbot_appointments(status);
CREATE INDEX idx_chatbot_appointments_date ON public.chatbot_appointments(preferred_date);

-- Trigger to update updated_at
CREATE TRIGGER update_chat_conversations_updated_at
BEFORE UPDATE ON public.chat_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chatbot_appointments_updated_at
BEFORE UPDATE ON public.chatbot_appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();