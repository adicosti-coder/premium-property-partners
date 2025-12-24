-- Add RLS policies for admin to manage properties
CREATE POLICY "Admins can insert properties" 
ON public.properties 
FOR INSERT 
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update properties" 
ON public.properties 
FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete properties" 
ON public.properties 
FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));