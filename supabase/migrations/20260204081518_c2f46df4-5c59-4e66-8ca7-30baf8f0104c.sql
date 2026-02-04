-- Strengthen referrals table RLS to prevent direct client access
-- Referrers should only access their data via the get-my-referrals edge function

-- Drop the existing policy that allows users to view their own referrals directly
DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;

-- Create a more restrictive policy: Only admins can SELECT from referrals directly
-- Referrers must use the get-my-referrals edge function which uses service_role
CREATE POLICY "Only admins can view referrals directly"
ON public.referrals
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- The "Admins can manage referrals" policy already handles INSERT/UPDATE/DELETE for admins
-- The submit-referral edge function uses service_role for INSERT (bypasses RLS)

-- For leads table, add an additional restrictive policy comment
-- The existing check_admin_leads_access() function with logging is already secure
-- Adding explicit COMMENT to document the security design
COMMENT ON TABLE public.leads IS 'Lead capture data - Admin-only access with audit logging via check_admin_leads_access(). Insertions via Edge Functions with service_role.';

COMMENT ON TABLE public.referrals IS 'Referral program data - Admin-only direct access. Referrers access via get-my-referrals edge function which filters sensitive fields (owner_email, owner_phone).';