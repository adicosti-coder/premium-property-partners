
CREATE TABLE public.admin_otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_otp_codes ENABLE ROW LEVEL SECURITY;

-- Only the system (edge functions with service role) can access this table
-- No direct client access needed

CREATE INDEX idx_admin_otp_user_id ON public.admin_otp_codes(user_id, expires_at);
