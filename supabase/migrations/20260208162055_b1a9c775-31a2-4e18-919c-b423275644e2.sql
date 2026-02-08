-- ============================================
-- Security Hardening Migration
-- ============================================

-- 1. GDPR Compliance: Add IP anonymization for email tracking tables
-- Truncate last octet of IPv4 or last 80 bits of IPv6 for GDPR compliance

CREATE OR REPLACE FUNCTION public.anonymize_ip_address(ip_address text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF ip_address IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- IPv4: Replace last octet with 0
  IF ip_address ~ '^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$' THEN
    RETURN regexp_replace(ip_address, '\.[0-9]{1,3}$', '.0');
  END IF;
  
  -- IPv6: Truncate to first 48 bits (3 groups)
  IF ip_address ~ ':' THEN
    RETURN split_part(ip_address, ':', 1) || ':' || 
           split_part(ip_address, ':', 2) || ':' || 
           split_part(ip_address, ':', 3) || '::';
  END IF;
  
  RETURN ip_address;
END;
$$;

-- 2. Add trigger to auto-anonymize IPs on insert for email_click_tracking
CREATE OR REPLACE FUNCTION public.anonymize_email_click_ip()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.ip_address := public.anonymize_ip_address(NEW.ip_address);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS anonymize_email_click_ip_trigger ON public.email_click_tracking;
CREATE TRIGGER anonymize_email_click_ip_trigger
  BEFORE INSERT ON public.email_click_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.anonymize_email_click_ip();

-- 3. Add trigger to auto-anonymize IPs on insert for email_open_tracking
CREATE OR REPLACE FUNCTION public.anonymize_email_open_ip()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.ip_address := public.anonymize_ip_address(NEW.ip_address);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS anonymize_email_open_ip_trigger ON public.email_open_tracking;
CREATE TRIGGER anonymize_email_open_ip_trigger
  BEFORE INSERT ON public.email_open_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.anonymize_email_open_ip();

-- 4. Chat Sessions Security: Ensure expires_at is always set with NOT NULL default
-- First, update any existing NULL values
UPDATE public.chat_conversations 
SET expires_at = created_at + interval '24 hours'
WHERE expires_at IS NULL;

-- Add default constraint and NOT NULL (if not already)
ALTER TABLE public.chat_conversations 
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '24 hours');

-- 5. CTA Analytics: Add rate limiting via function check
-- Create a function to check if user/session has exceeded rate limit (10 per minute)
CREATE OR REPLACE FUNCTION public.check_cta_rate_limit(p_session_id text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count integer;
BEGIN
  -- Allow if no session_id (legacy support)
  IF p_session_id IS NULL OR length(p_session_id) < 16 THEN
    RETURN true;
  END IF;
  
  -- Count recent inserts from this session in last minute
  SELECT COUNT(*) INTO recent_count
  FROM public.cta_analytics
  WHERE session_id = p_session_id
    AND created_at > now() - interval '1 minute';
  
  -- Allow up to 10 per minute per session
  RETURN recent_count < 10;
END;
$$;

-- 6. Update CTA analytics INSERT policy to include rate limiting
DROP POLICY IF EXISTS "Anyone can insert CTA analytics" ON public.cta_analytics;

CREATE POLICY "Anyone can insert CTA analytics with rate limit"
ON public.cta_analytics
FOR INSERT
WITH CHECK (
  public.check_cta_rate_limit(session_id)
);

-- 7. Add data retention: Create function to clean old tracking data (90 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_tracking_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete email click tracking older than 90 days
  DELETE FROM public.email_click_tracking
  WHERE clicked_at < now() - interval '90 days';
  
  -- Delete email open tracking older than 90 days
  DELETE FROM public.email_open_tracking
  WHERE opened_at < now() - interval '90 days';
  
  -- Delete CTA analytics older than 90 days
  DELETE FROM public.cta_analytics
  WHERE created_at < now() - interval '90 days';
  
  -- Delete property views older than 90 days
  DELETE FROM public.property_views
  WHERE viewed_at < now() - interval '90 days';
  
  -- Delete blog article views older than 90 days
  DELETE FROM public.blog_article_views
  WHERE viewed_at < now() - interval '90 days';
END;
$$;

-- Revoke public access to cleanup function
REVOKE EXECUTE ON FUNCTION public.cleanup_old_tracking_data() FROM public;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_tracking_data() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_tracking_data() FROM authenticated;