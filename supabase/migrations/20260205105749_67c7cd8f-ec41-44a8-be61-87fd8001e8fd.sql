-- Fix the RLS policy that causes INSERT during SELECT (read-only transaction error)
-- The check_admin_leads_access function tries to INSERT logs during SELECT which fails

-- Drop the problematic RLS policy
DROP POLICY IF EXISTS "Admins can read leads with logging" ON public.leads;

-- Create a simpler SELECT policy that doesn't try to log
CREATE POLICY "Admins can read leads"
ON public.leads
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Drop the problematic function that causes the read-only transaction error
DROP FUNCTION IF EXISTS public.check_admin_leads_access();

-- Optionally: Create a separate trigger-based logging approach if needed
-- This is done via a BEFORE trigger on a separate audit function, not in RLS
CREATE OR REPLACE FUNCTION public.log_admin_leads_select()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only log if the accessing user is an admin
  -- Note: This function should be called via a different mechanism, not RLS
  IF public.has_role(auth.uid(), 'admin') THEN
    BEGIN
      INSERT INTO public.admin_access_logs (
        admin_user_id,
        table_name,
        action_type,
        record_id
      ) VALUES (
        auth.uid(),
        'leads',
        'SELECT',
        NULL
      );
    EXCEPTION WHEN OTHERS THEN
      -- Silently ignore logging errors to not break the main query
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;