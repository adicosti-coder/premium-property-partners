-- Add RLS policy for authenticated users to read leads
CREATE POLICY "Authenticated users can read leads" 
ON public.leads 
FOR SELECT 
TO authenticated
USING (true);

-- Add RLS policy for authenticated users to delete leads
CREATE POLICY "Authenticated users can delete leads" 
ON public.leads 
FOR DELETE 
TO authenticated
USING (true);