-- Add admin reply columns to property_reviews table
ALTER TABLE public.property_reviews
ADD COLUMN admin_reply TEXT,
ADD COLUMN admin_reply_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN admin_reply_by UUID REFERENCES auth.users(id);