-- Create function to insert welcome notifications for new users
CREATE OR REPLACE FUNCTION public.create_welcome_notifications()
RETURNS TRIGGER AS $$
BEGIN
  -- Welcome notification
  INSERT INTO public.user_notifications (user_id, title, message, type, action_url, action_label)
  VALUES (
    NEW.id,
    'Bine ai venit la RealTrust! 🎉',
    'Suntem încântați să te avem alături. Explorează platforma și descoperă cum te putem ajuta să îți maximizezi veniturile din închiriere.',
    'success',
    '/',
    'Explorează'
  );

  -- Tip: Calculator notification
  INSERT INTO public.user_notifications (user_id, title, message, type, action_url, action_label)
  VALUES (
    NEW.id,
    'Calculează-ți potențialul de venit 💰',
    'Folosește calculatorul nostru avansat pentru a estima cât poți câștiga din închirierea proprietății tale pe termen scurt.',
    'action',
    '/pentru-proprietari',
    'Vezi Calculator'
  );

  -- Tip: Properties notification
  INSERT INTO public.user_notifications (user_id, title, message, type, action_url, action_label)
  VALUES (
    NEW.id,
    'Descoperă proprietățile noastre 🏠',
    'Explorează portofoliul nostru de apartamente gestionate profesional și vezi standardele noastre de calitate.',
    'info',
    '/oaspeti',
    'Vezi Proprietăți'
  );

  -- Tip: Profile completion
  INSERT INTO public.user_notifications (user_id, title, message, type, action_url, action_label)
  VALUES (
    NEW.id,
    'Completează-ți profilul 👤',
    'Adaugă o fotografie și numele tău complet pentru o experiență personalizată pe platformă.',
    'action',
    '/profil',
    'Editează Profil'
  );

  -- Tip: Blog notification
  INSERT INTO public.user_notifications (user_id, title, message, type, action_url, action_label)
  VALUES (
    NEW.id,
    'Citește articolele noastre 📚',
    'Află cele mai bune sfaturi despre închirierea pe termen scurt, ghiduri locale și noutăți din industrie.',
    'info',
    '/blog',
    'Vezi Blog'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on profiles table for new user signups
DROP TRIGGER IF EXISTS on_new_user_welcome_notifications ON public.profiles;
CREATE TRIGGER on_new_user_welcome_notifications
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_welcome_notifications();