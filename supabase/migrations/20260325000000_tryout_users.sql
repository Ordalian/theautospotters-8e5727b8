-- Tryout users: anonymous sign-in, full access, data erased when they leave.
-- Required: Supabase Dashboard > Authentication > Providers > Enable "Anonymous" sign-in.
-- 1. Add is_tryout to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_tryout boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_tryout IS 'True for anonymous tryout sessions; data is deleted when user leaves.';

-- 2. handle_new_user: support anonymous users (NULL email)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  uname text;
BEGIN
  IF NEW.email IS NULL OR (NEW.raw_user_meta_data->>'provider') = 'anonymous' THEN
    uname := COALESCE(NEW.raw_user_meta_data->>'username', 'Tryout');
  ELSE
    uname := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  END IF;
  INSERT INTO public.profiles (user_id, username)
  VALUES (NEW.id, uname);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Allow user to set is_tryout on own profile (do not add to profiles_protect_columns or policy WITH CHECK)
-- Policy "Users can update own profile" already allows update where auth.uid() = user_id;
-- is_tryout is not in the WITH CHECK list so user can set it to true.

-- 4. RPC: delete tryout user data (call on leave); only for current user when is_tryout = true
CREATE OR REPLACE FUNCTION public.delete_tryout_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = uid AND is_tryout = true) THEN
    RETURN;
  END IF;

  -- Delete in dependency order (child tables first where needed)
  DELETE FROM public.dm_conversation_status WHERE user_id = uid OR other_user_id = uid;
  DELETE FROM public.direct_messages WHERE sender_id = uid OR receiver_id = uid;
  DELETE FROM public.channel_replies WHERE user_id = uid;
  DELETE FROM public.channel_topics WHERE user_id = uid;
  DELETE FROM public.channel_subscriptions WHERE user_id = uid;
  DELETE FROM public.notifications WHERE user_id = uid;
  DELETE FROM public.car_likes WHERE user_id = uid;
  DELETE FROM public.owned_vehicles WHERE user_id = uid;
  DELETE FROM public.cars WHERE user_id = uid;
  DELETE FROM public.garage_groups WHERE user_id = uid;
  DELETE FROM public.friendships WHERE requester_id = uid OR addressee_id = uid;
  DELETE FROM public.page_views WHERE user_id = uid;
  DELETE FROM public.feature_usage WHERE user_id = uid;
  DELETE FROM public.support_replies WHERE user_id = uid;
  DELETE FROM public.support_tickets WHERE user_id = uid;
  DELETE FROM public.user_game_cards WHERE user_id = uid;
  DELETE FROM public.user_deck WHERE user_id = uid;
  DELETE FROM public.user_booster_cooldown WHERE user_id = uid;
  DELETE FROM public.user_owned_styles WHERE user_id = uid;
  DELETE FROM public.user_purchased_boosters WHERE user_id = uid;
  DELETE FROM public.spotter_usage WHERE user_id = uid;
  DELETE FROM public.user_xp_gains WHERE user_id = uid;
  DELETE FROM public.poi_battle_cards WHERE user_id = uid;
  DELETE FROM public.profiles WHERE user_id = uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_tryout_user() TO authenticated;
