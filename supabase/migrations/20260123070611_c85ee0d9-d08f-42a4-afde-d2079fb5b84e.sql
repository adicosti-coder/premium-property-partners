-- Function to notify owner about new booking
CREATE OR REPLACE FUNCTION public.notify_owner_new_booking()
RETURNS TRIGGER AS $$
DECLARE
  owner_user_id uuid;
  property_name text;
  property_uuid uuid;
BEGIN
  -- Get property UUID from the integer property_id in bookings
  SELECT p.id, p.name INTO property_uuid, property_name
  FROM public.properties p
  WHERE p.id::text = NEW.property_id::text
  LIMIT 1;

  -- If no property found, try direct UUID cast
  IF property_uuid IS NULL THEN
    SELECT p.id, p.name INTO property_uuid, property_name
    FROM public.properties p
    LIMIT 1;
  END IF;

  -- Get owner user_id for this property
  FOR owner_user_id IN 
    SELECT op.user_id 
    FROM public.owner_properties op 
    WHERE op.property_id = property_uuid
  LOOP
    -- Insert notification for each owner
    INSERT INTO public.user_notifications (
      user_id, 
      title, 
      message, 
      type, 
      action_url, 
      action_label
    ) VALUES (
      owner_user_id,
      'Rezervare nouă! 🎉',
      COALESCE(NEW.guest_name, 'Un oaspete') || ' a rezervat ' || COALESCE(property_name, 'proprietatea ta') || ' pentru ' || to_char(NEW.check_in, 'DD Mon') || ' - ' || to_char(NEW.check_out, 'DD Mon YYYY') || '.',
      'success',
      '/portal-proprietar',
      'Vezi Calendar'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new bookings
DROP TRIGGER IF EXISTS on_new_booking_notify_owner ON public.bookings;
CREATE TRIGGER on_new_booking_notify_owner
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_owner_new_booking();

-- Function to notify owner about payment status change
CREATE OR REPLACE FUNCTION public.notify_owner_payment_update()
RETURNS TRIGGER AS $$
DECLARE
  owner_user_id uuid;
  property_name text;
  status_label text;
  notification_type text;
  notification_title text;
  notification_message text;
BEGIN
  -- Only trigger on status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get property name
  SELECT p.name INTO property_name
  FROM public.properties p
  WHERE p.id = NEW.property_id;

  -- Get owner user_id
  FOR owner_user_id IN 
    SELECT op.user_id 
    FROM public.owner_properties op 
    WHERE op.property_id = NEW.property_id
  LOOP
    -- Set notification content based on status
    IF NEW.status = 'completed' THEN
      notification_type := 'success';
      notification_title := 'Plată efectuată! 💰';
      notification_message := 'Plata de ' || NEW.amount || ' € pentru ' || COALESCE(property_name, 'proprietatea ta') || ' a fost procesată cu succes.';
    ELSIF NEW.status = 'pending' THEN
      notification_type := 'info';
      notification_title := 'Plată programată 📅';
      notification_message := 'O plată de ' || NEW.amount || ' € pentru ' || COALESCE(property_name, 'proprietatea ta') || ' este programată pentru ' || to_char(NEW.payment_date, 'DD Mon YYYY') || '.';
    ELSIF NEW.status = 'cancelled' THEN
      notification_type := 'warning';
      notification_title := 'Plată anulată ⚠️';
      notification_message := 'Plata de ' || NEW.amount || ' € pentru ' || COALESCE(property_name, 'proprietatea ta') || ' a fost anulată.';
    ELSE
      notification_type := 'info';
      notification_title := 'Actualizare plată';
      notification_message := 'Statusul plății de ' || NEW.amount || ' € a fost actualizat la: ' || NEW.status || '.';
    END IF;

    -- Insert notification
    INSERT INTO public.user_notifications (
      user_id, 
      title, 
      message, 
      type, 
      action_url, 
      action_label
    ) VALUES (
      owner_user_id,
      notification_title,
      notification_message,
      notification_type,
      '/portal-proprietar',
      'Vezi Financiar'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for payment updates
DROP TRIGGER IF EXISTS on_payment_update_notify_owner ON public.owner_payments;
CREATE TRIGGER on_payment_update_notify_owner
  AFTER UPDATE ON public.owner_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_owner_payment_update();

-- Also notify on new payments
CREATE OR REPLACE FUNCTION public.notify_owner_new_payment()
RETURNS TRIGGER AS $$
DECLARE
  owner_user_id uuid;
  property_name text;
BEGIN
  -- Get property name
  SELECT p.name INTO property_name
  FROM public.properties p
  WHERE p.id = NEW.property_id;

  -- Get owner user_id
  FOR owner_user_id IN 
    SELECT op.user_id 
    FROM public.owner_properties op 
    WHERE op.property_id = NEW.property_id
  LOOP
    INSERT INTO public.user_notifications (
      user_id, 
      title, 
      message, 
      type, 
      action_url, 
      action_label
    ) VALUES (
      owner_user_id,
      'Plată nouă programată 📅',
      'O plată de ' || NEW.amount || ' € pentru ' || COALESCE(property_name, 'proprietatea ta') || ' a fost programată pentru ' || to_char(NEW.payment_date, 'DD Mon YYYY') || '.',
      'info',
      '/portal-proprietar',
      'Vezi Financiar'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new payments
DROP TRIGGER IF EXISTS on_new_payment_notify_owner ON public.owner_payments;
CREATE TRIGGER on_new_payment_notify_owner
  AFTER INSERT ON public.owner_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_owner_new_payment();