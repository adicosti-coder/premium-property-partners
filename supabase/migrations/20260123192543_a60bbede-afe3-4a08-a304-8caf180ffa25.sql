-- Create table for community article comments
CREATE TABLE public.community_article_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES public.user_article_submissions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.community_article_comments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Comments are publicly readable" 
ON public.community_article_comments 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert comments" 
ON public.community_article_comments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" 
ON public.community_article_comments 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" 
ON public.community_article_comments 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all comments" 
ON public.community_article_comments 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_community_comments_updated_at
BEFORE UPDATE ON public.community_article_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();