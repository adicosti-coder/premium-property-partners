-- Create function to notify user when they earn a badge
CREATE OR REPLACE FUNCTION public.notify_badge_earned()
RETURNS TRIGGER AS $$
DECLARE
  badge_record RECORD;
BEGIN
  -- Get badge details
  SELECT name_ro, name_en, icon, tier INTO badge_record
  FROM public.community_badges
  WHERE id = NEW.badge_id;
  
  -- Insert notification for the user
  INSERT INTO public.user_notifications (
    user_id,
    title,
    message,
    type,
    action_url,
    action_label
  ) VALUES (
    NEW.user_id,
    '🏆 Felicitări! Ai obținut un badge nou!',
    'Ai primit badge-ul "' || badge_record.name_ro || '" (' || 
    CASE badge_record.tier 
      WHEN 'platinum' THEN 'Platinum'
      WHEN 'gold' THEN 'Gold'
      WHEN 'silver' THEN 'Silver'
      ELSE 'Bronze'
    END || '). Continuă să contribui la comunitate!',
    'success',
    '/profil',
    'Vezi badge-urile'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to fire when a badge is earned
DROP TRIGGER IF EXISTS notify_on_badge_earned ON public.user_badges;
CREATE TRIGGER notify_on_badge_earned
AFTER INSERT ON public.user_badges
FOR EACH ROW
EXECUTE FUNCTION public.notify_badge_earned();