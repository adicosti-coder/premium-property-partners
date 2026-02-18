
-- Create chat ratings table
CREATE TABLE public.chat_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.chat_conversations(id),
  session_id TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert chat ratings"
ON public.chat_ratings FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view chat ratings"
ON public.chat_ratings FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));
