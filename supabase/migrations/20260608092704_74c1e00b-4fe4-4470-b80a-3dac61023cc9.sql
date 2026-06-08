-- Defense-in-depth restrictive SELECT policies (admin-only) for sensitive tables.

CREATE POLICY "Deny non-admin authenticated select on referrals"
ON public.referrals
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Deny non-admin authenticated select on voice_agent_scripts"
ON public.voice_agent_scripts
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Deny non-admin authenticated select on voice_agent_script_versions"
ON public.voice_agent_script_versions
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));