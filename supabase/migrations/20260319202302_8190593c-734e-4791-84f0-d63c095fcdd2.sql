
-- 1. Create push_subscriptions table
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own push subscriptions" ON public.push_subscriptions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Friend request received trigger
CREATE OR REPLACE FUNCTION public.notify_friend_request_received()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  requester_username text;
BEGIN
  IF NEW.status = 'pending' THEN
    SELECT COALESCE(p.username, 'Anonyme') INTO requester_username
    FROM public.profiles p WHERE p.user_id = NEW.requester_id;

    INSERT INTO public.notifications (user_id, type, data)
    VALUES (NEW.addressee_id, 'friend_request', jsonb_build_object(
      'requester_id', NEW.requester_id,
      'requester_username', requester_username
    ));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_friend_request_received
AFTER INSERT ON public.friendships
FOR EACH ROW EXECUTE FUNCTION public.notify_friend_request_received();

-- 3. Friend request accepted trigger (uses the update_friendship_status RPC which does the update)
CREATE OR REPLACE FUNCTION public.notify_friend_request_accepted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  accepter_username text;
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    SELECT COALESCE(p.username, 'Anonyme') INTO accepter_username
    FROM public.profiles p WHERE p.user_id = NEW.addressee_id;

    INSERT INTO public.notifications (user_id, type, data)
    VALUES (NEW.requester_id, 'friend_accepted', jsonb_build_object(
      'accepter_id', NEW.addressee_id,
      'accepter_username', accepter_username
    ));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_friend_request_accepted
AFTER UPDATE ON public.friendships
FOR EACH ROW EXECUTE FUNCTION public.notify_friend_request_accepted();

-- 4. DM received trigger
CREATE OR REPLACE FUNCTION public.notify_dm_received()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  sender_username text;
BEGIN
  SELECT COALESCE(p.username, 'Anonyme') INTO sender_username
  FROM public.profiles p WHERE p.user_id = NEW.sender_id;

  INSERT INTO public.notifications (user_id, type, data)
  VALUES (NEW.receiver_id, 'dm_received', jsonb_build_object(
    'sender_id', NEW.sender_id,
    'sender_username', sender_username,
    'message_preview', LEFT(NEW.body, 80)
  ));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_dm_received
AFTER INSERT ON public.direct_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_dm_received();

-- 5. Group chat message trigger
CREATE OR REPLACE FUNCTION public.notify_group_chat_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  sender_username text;
  chat_title text;
  r RECORD;
BEGIN
  SELECT COALESCE(p.username, 'Anonyme') INTO sender_username
  FROM public.profiles p WHERE p.user_id = NEW.sender_id;

  SELECT gc.title INTO chat_title
  FROM public.group_chats gc WHERE gc.id = NEW.chat_id;

  FOR r IN
    SELECT m.user_id FROM public.group_chat_members m
    WHERE m.chat_id = NEW.chat_id AND m.left_at IS NULL AND m.user_id != NEW.sender_id
  LOOP
    INSERT INTO public.notifications (user_id, type, data)
    VALUES (r.user_id, 'group_message', jsonb_build_object(
      'chat_id', NEW.chat_id,
      'chat_title', chat_title,
      'sender_id', NEW.sender_id,
      'sender_username', sender_username,
      'message_preview', LEFT(NEW.body, 80)
    ));
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_group_chat_message
AFTER INSERT ON public.group_chat_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_group_chat_message();

-- 6. Friend spotted a vehicle trigger
CREATE OR REPLACE FUNCTION public.notify_friends_new_spot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  spotter_username text;
  r RECORD;
BEGIN
  -- Skip deliveries (handled separately) and hot_wheels
  IF NEW.delivered_by_user_id IS NOT NULL OR COALESCE(NEW.vehicle_type, 'car') = 'hot_wheels' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(p.username, 'Anonyme') INTO spotter_username
  FROM public.profiles p WHERE p.user_id = NEW.user_id;

  FOR r IN
    SELECT CASE
      WHEN f.requester_id = NEW.user_id THEN f.addressee_id
      ELSE f.requester_id
    END AS friend_id
    FROM public.friendships f
    WHERE f.status = 'accepted'
      AND (f.requester_id = NEW.user_id OR f.addressee_id = NEW.user_id)
  LOOP
    INSERT INTO public.notifications (user_id, type, data)
    VALUES (r.friend_id, 'friend_spot', jsonb_build_object(
      'spotter_id', NEW.user_id,
      'spotter_username', spotter_username,
      'brand', NEW.brand,
      'model', NEW.model,
      'year', NEW.year,
      'car_id', NEW.id
    ));
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_friends_new_spot
AFTER INSERT ON public.cars
FOR EACH ROW EXECUTE FUNCTION public.notify_friends_new_spot();

-- 7. Vehicle delivered trigger
CREATE OR REPLACE FUNCTION public.notify_vehicle_delivered()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  deliverer_username text;
BEGIN
  IF NEW.delivered_by_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(p.username, 'Anonyme') INTO deliverer_username
  FROM public.profiles p WHERE p.user_id = NEW.delivered_by_user_id;

  INSERT INTO public.notifications (user_id, type, data)
  VALUES (NEW.user_id, 'vehicle_delivered', jsonb_build_object(
    'deliverer_id', NEW.delivered_by_user_id,
    'deliverer_username', deliverer_username,
    'brand', NEW.brand,
    'model', NEW.model,
    'year', NEW.year,
    'car_id', NEW.id
  ));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_vehicle_delivered
AFTER INSERT ON public.cars
FOR EACH ROW EXECUTE FUNCTION public.notify_vehicle_delivered();

-- 8. Store VAPID public key in app_config
INSERT INTO public.app_config (key, value)
VALUES ('vapid_public_key', '"BIxqH3anY6KdbenCeilIQV6-zUUBL6LlPBiB3BKBe5PWyKfY211G-ImMYZuwwj-NbgI_BQZmQxBz3Gh5OA_Bvic"'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
