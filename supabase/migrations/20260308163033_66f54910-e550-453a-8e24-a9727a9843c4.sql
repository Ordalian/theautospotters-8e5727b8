
CREATE OR REPLACE FUNCTION public.notify_car_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  car_owner_id uuid;
  car_brand text;
  car_model text;
  liker_username text;
BEGIN
  -- Get car owner
  SELECT c.user_id, c.brand, c.model INTO car_owner_id, car_brand, car_model
  FROM public.cars c WHERE c.id = NEW.car_id;

  -- Don't notify if liking own car
  IF car_owner_id IS NULL OR car_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Get liker username
  SELECT COALESCE(p.username, 'Anonyme') INTO liker_username
  FROM public.profiles p WHERE p.user_id = NEW.user_id;

  INSERT INTO public.notifications (user_id, type, data)
  VALUES (car_owner_id, 'car_like', jsonb_build_object(
    'car_id', NEW.car_id,
    'brand', car_brand,
    'model', car_model,
    'liker_user_id', NEW.user_id,
    'liker_username', liker_username
  ));

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_car_like_notify
AFTER INSERT ON public.car_likes
FOR EACH ROW
EXECUTE FUNCTION public.notify_car_like();
