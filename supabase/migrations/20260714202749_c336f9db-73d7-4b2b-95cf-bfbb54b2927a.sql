-- Server-side MFA verification state so client-only sessionStorage can no longer bypass the OTP gate.
CREATE TABLE IF NOT EXISTS public.admin_mfa_sessions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  verified_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  user_agent text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Data API grants: admins read their own row via has_valid_admin_mfa (SECURITY DEFINER),
-- but we still allow the authenticated role to SELECT (RLS scoped to auth.uid()) so the UI
-- can show "MFA valid until" without a round-trip through a function.
GRANT SELECT ON public.admin_mfa_sessions TO authenticated;
GRANT ALL ON public.admin_mfa_sessions TO service_role;

ALTER TABLE public.admin_mfa_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view their own MFA session" ON public.admin_mfa_sessions;
CREATE POLICY "Admins can view their own MFA session"
ON public.admin_mfa_sessions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- No client-side INSERT/UPDATE/DELETE — service role only (edge function verify-admin-otp).
DROP POLICY IF EXISTS "No client writes to admin MFA sessions" ON public.admin_mfa_sessions;
CREATE POLICY "No client writes to admin MFA sessions"
ON public.admin_mfa_sessions
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- Fast path used by AdminMFAGuard on every mount.
CREATE OR REPLACE FUNCTION public.has_valid_admin_mfa()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_mfa_sessions s
    WHERE s.user_id = auth.uid()
      AND s.expires_at > now()
  ) AND public.has_role(auth.uid(), 'admin'::app_role);
$$;

GRANT EXECUTE ON FUNCTION public.has_valid_admin_mfa() TO authenticated;

-- Called at sign-out and on the "Lock" button to drop the MFA state early.
CREATE OR REPLACE FUNCTION public.revoke_admin_mfa()
RETURNS void
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.admin_mfa_sessions WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.revoke_admin_mfa() TO authenticated;

CREATE OR REPLACE FUNCTION public.set_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_mfa_sessions_updated_at ON public.admin_mfa_sessions;
CREATE TRIGGER trg_admin_mfa_sessions_updated_at
BEFORE UPDATE ON public.admin_mfa_sessions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_column();