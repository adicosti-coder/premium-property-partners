
CREATE TABLE public.saved_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_code text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
  items jsonb NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  shared_via text[] DEFAULT '{}',
  view_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_saved_comparisons_share_code ON public.saved_comparisons(share_code);
CREATE INDEX idx_saved_comparisons_user_id ON public.saved_comparisons(user_id);

ALTER TABLE public.saved_comparisons ENABLE ROW LEVEL SECURITY;

-- Anyone can view shared comparisons (public links)
CREATE POLICY "Anyone can view saved comparisons" ON public.saved_comparisons
  FOR SELECT USING (true);

-- Anyone can create comparisons (logged in or anonymous via session)
CREATE POLICY "Anyone can insert comparisons" ON public.saved_comparisons
  FOR INSERT WITH CHECK (true);

-- Only owner can update their comparisons
CREATE POLICY "Users can update own comparisons" ON public.saved_comparisons
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins can view all
CREATE POLICY "Admins can manage all comparisons" ON public.saved_comparisons
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
