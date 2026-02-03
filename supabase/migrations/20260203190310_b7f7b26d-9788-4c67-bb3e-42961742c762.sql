-- Create a trigger function to log admin access to the leads table
CREATE OR REPLACE FUNCTION public.log_admin_leads_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log if the accessing user is an admin
  IF public.has_role(auth.uid(), 'admin') THEN
    INSERT INTO public.admin_access_logs (
      admin_user_id,
      table_name,
      action_type,
      record_id
    ) VALUES (
      auth.uid(),
      'leads',
      TG_OP,
      NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on leads table for SELECT operations
-- Note: PostgreSQL doesn't support SELECT triggers directly, so we'll use RLS policy with logging
-- Instead, create a view for admins that logs access

-- First, drop existing admin read policy and create one that logs
DROP POLICY IF EXISTS "Admins can read leads" ON public.leads;

-- Create a function that logs and returns true for admin access
CREATE OR REPLACE FUNCTION public.check_admin_leads_access()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  is_admin := public.has_role(auth.uid(), 'admin');
  
  IF is_admin THEN
    -- Log the access attempt
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
  END IF;
  
  RETURN is_admin;
END;
$$;

-- Create new policy that uses the logging function
CREATE POLICY "Admins can read leads with logging"
ON public.leads
FOR SELECT
USING (public.check_admin_leads_access());