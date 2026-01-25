-- Create email_campaigns table for promotional campaigns
CREATE TABLE public.email_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  campaign_type TEXT NOT NULL DEFAULT 'promotional', -- 'welcome', 'promotional', 'newsletter'
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'scheduled', 'sending', 'sent', 'cancelled'
  recipient_filter JSONB DEFAULT '{}', -- filter criteria for recipients
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email_campaign_sends table to track individual sends
CREATE TABLE public.email_campaign_sends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_user_id UUID,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'sent' -- 'sent', 'opened', 'clicked', 'bounced', 'unsubscribed'
);

-- Enable RLS on both tables
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaign_sends ENABLE ROW LEVEL SECURITY;

-- Policies for email_campaigns - admins only
CREATE POLICY "Admins can manage email campaigns"
ON public.email_campaigns
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Policies for email_campaign_sends - admins only for viewing
CREATE POLICY "Admins can view campaign sends"
ON public.email_campaign_sends
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Service role can insert/update campaign sends (for edge functions)
CREATE POLICY "Service role can manage campaign sends"
ON public.email_campaign_sends
FOR ALL
USING (false)
WITH CHECK (false);

-- Add trigger for updated_at on campaigns
CREATE TRIGGER update_email_campaigns_updated_at
BEFORE UPDATE ON public.email_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_email_campaigns_status ON public.email_campaigns(status);
CREATE INDEX idx_email_campaigns_type ON public.email_campaigns(campaign_type);
CREATE INDEX idx_email_campaign_sends_campaign ON public.email_campaign_sends(campaign_id);
CREATE INDEX idx_email_campaign_sends_email ON public.email_campaign_sends(recipient_email);