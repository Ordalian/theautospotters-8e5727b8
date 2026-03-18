-- Block sending coins to blacklisted users
CREATE OR REPLACE FUNCTION public.send_coins_to_friend(p_to_user_id uuid, p_amount integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  from_id uuid := auth.uid();
  my_coins int;
  my_last_sent timestamptz;
  are_friends boolean;
BEGIN
  IF from_id IS NULL OR p_to_user_id IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_params');
  END IF;
  IF from_id = p_to_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'cannot_send_to_self');
  END IF;

  IF public.is_blacklisted(from_id, p_to_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'blacklisted');
  END IF;

  SELECT coins, last_coin_sent_at INTO my_coins, my_last_sent
  FROM public.profiles WHERE user_id = from_id;

  IF my_coins IS NULL OR my_coins < p_amount THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_coins');
  END IF;

  IF my_last_sent IS NOT NULL AND my_last_sent > now() - interval '24 hours' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'cooldown_24h');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
      AND ((f.requester_id = from_id AND f.addressee_id = p_to_user_id)
           OR (f.requester_id = p_to_user_id AND f.addressee_id = from_id))
  ) INTO are_friends;

  IF NOT are_friends THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_friends');
  END IF;

  UPDATE public.profiles SET coins = coins - p_amount WHERE user_id = from_id;
  UPDATE public.profiles SET coins = COALESCE(coins, 0) + p_amount WHERE user_id = p_to_user_id;
  UPDATE public.profiles SET last_coin_sent_at = now() WHERE user_id = from_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;
