-- Add DELETE policy for shared_poi_links table
CREATE POLICY "Users can delete their own shared links"
ON public.shared_poi_links
FOR DELETE
USING (auth.uid() = user_id);