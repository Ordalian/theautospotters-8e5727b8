-- Economy: coins, send coin, store, purchased boosters, paid art styles

-- 1. Profiles: coins and last coin send cooldown
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS coins integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_coin_sent_at timestamptz DEFAULT NULL;

-- 2. User owned (unlocked) art styles — paid themes
CREATE TABLE IF NOT EXISTS public.user_owned_styles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  style_id text NOT NULL,
  obtained_at timestamptz NOT NULL DEFAULT now(),
  obtained_via text NOT NULL DEFAULT 'purchase' CHECK (obtained_via IN ('purchase', 'booster')),
  UNIQUE(user_id, style_id)
);

ALTER TABLE public.user_owned_styles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own owned_styles"
  ON public.user_owned_styles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users cannot insert owned_styles directly"
  ON public.user_owned_styles FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY "Users cannot update owned_styles"
  ON public.user_owned_styles FOR UPDATE TO authenticated
  USING (false);

CREATE INDEX IF NOT EXISTS idx_user_owned_styles_user ON public.user_owned_styles(user_id);

-- 3. Purchased boosters (stock to open)
CREATE TABLE IF NOT EXISTS public.user_purchased_boosters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  pending_count integer NOT NULL DEFAULT 0 CHECK (pending_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_purchased_boosters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own purchased_boosters"
  ON public.user_purchased_boosters FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users cannot insert/update purchased_boosters directly"
  ON public.user_purchased_boosters FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE INDEX IF NOT EXISTS idx_user_purchased_boosters_user ON public.user_purchased_boosters(user_id);

-- 4. Grant coins when spotting a car (3 per rarity level)
CREATE OR REPLACE FUNCTION public.grant_coins_for_spot(p_rarity_rating integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  add_coins int;
BEGIN
  add_coins := GREATEST(1, LEAST(10, COALESCE(p_rarity_rating, 1))) * 3;
  UPDATE public.profiles
  SET coins = COALESCE(coins, 0) + add_coins
  WHERE user_id = auth.uid();
END;
$$;
GRANT EXECUTE ON FUNCTION public.grant_coins_for_spot(integer) TO authenticated;

-- 5. Send coins to a friend (once per 24h, balance check)
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
GRANT EXECUTE ON FUNCTION public.send_coins_to_friend(uuid, integer) TO authenticated;

-- 6. Add coins (for store "free" purchase — no real payment yet)
CREATE OR REPLACE FUNCTION public.add_coins(p_amount integer)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
  SET coins = COALESCE(coins, 0) + p_amount
  WHERE user_id = auth.uid() AND p_amount > 0 AND p_amount <= 10000;
$$;
GRANT EXECUTE ON FUNCTION public.add_coins(integer) TO authenticated;

-- 7. Add purchased boosters (deduct coins, add to pending). Cost: 1=100, 5=500, 10=900
CREATE OR REPLACE FUNCTION public.add_purchased_boosters(pack_size integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  cost int;
  my_coins int;
BEGIN
  cost := CASE pack_size
    WHEN 1 THEN 100
    WHEN 5 THEN 500
    WHEN 10 THEN 900
    ELSE 0
  END;
  IF cost = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_pack');
  END IF;

  SELECT coins INTO my_coins FROM public.profiles WHERE user_id = uid;
  IF my_coins IS NULL OR my_coins < cost THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_coins');
  END IF;

  UPDATE public.profiles SET coins = coins - cost WHERE user_id = uid;

  INSERT INTO public.user_purchased_boosters (user_id, pending_count, updated_at)
  VALUES (uid, pack_size, now())
  ON CONFLICT (user_id) DO UPDATE
  SET pending_count = user_purchased_boosters.pending_count + pack_size,
      updated_at = now();

  RETURN jsonb_build_object('ok', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.add_purchased_boosters(integer) TO authenticated;

-- 8. Consume one purchased booster (returns true if had stock)
CREATE OR REPLACE FUNCTION public.consume_purchased_booster()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  had int;
BEGIN
  UPDATE public.user_purchased_boosters
  SET pending_count = GREATEST(0, pending_count - 1),
      updated_at = now()
  WHERE user_id = uid AND pending_count > 0
  RETURNING pending_count + 1 INTO had;

  IF had IS NULL THEN
    RETURN false;
  END IF;
  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.consume_purchased_booster() TO authenticated;

-- 9. Unlock style with coins (50 or 80). Style IDs defined in app; price checked in app or here via lookup.
-- We accept style_id and price; server checks balance and deducts.
CREATE OR REPLACE FUNCTION public.unlock_style(p_style_id text, p_price integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  my_coins int;
  already boolean;
BEGIN
  IF p_price IS NULL OR p_price NOT IN (50, 80) OR p_style_id IS NULL OR p_style_id = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_params');
  END IF;

  SELECT coins INTO my_coins FROM public.profiles WHERE user_id = uid;
  IF my_coins IS NULL OR my_coins < p_price THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_coins');
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.user_owned_styles WHERE user_id = uid AND style_id = p_style_id) INTO already;
  IF already THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_owned');
  END IF;

  UPDATE public.profiles SET coins = coins - p_price WHERE user_id = uid;

  INSERT INTO public.user_owned_styles (user_id, style_id, obtained_via)
  VALUES (uid, p_style_id, 'purchase');

  RETURN jsonb_build_object('ok', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.unlock_style(text, integer) TO authenticated;

-- 10. Process booster style drop (2% chance). Returns style_id or null; if already owned returns refund amount.
-- Style list: 6 at 50 coins, 4 at 80 coins. Random pick, then check ownership.
CREATE OR REPLACE FUNCTION public.process_booster_style_drop()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  roll float := random();
  style_id text;
  style_price int;
  idx int;
  styles_50 text[] := ARRAY['style-midnight','style-sakura','style-aurora','style-sunset','style-forest','style-ocean'];
  styles_80 text[] := ARRAY['style-neon','style-gold','style-cyber','style-cosmic'];
  already boolean;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('granted_style_id', null, 'refund_coins', 0);
  END IF;

  IF roll >= 0.02 THEN
    RETURN jsonb_build_object('granted_style_id', null, 'refund_coins', 0);
  END IF;

  -- Pick random style: 60% from 50-coins, 40% from 80-coins
  IF random() < 0.6 THEN
    idx := 1 + floor(random() * array_length(styles_50, 1))::int;
    style_id := styles_50[idx];
    style_price := 50;
  ELSE
    idx := 1 + floor(random() * array_length(styles_80, 1))::int;
    style_id := styles_80[idx];
    style_price := 80;
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.user_owned_styles WHERE user_id = uid AND user_owned_styles.style_id = process_booster_style_drop.style_id) INTO already;

  IF already THEN
    UPDATE public.profiles SET coins = COALESCE(coins, 0) + style_price WHERE user_id = uid;
    RETURN jsonb_build_object('granted_style_id', null, 'refund_coins', style_price);
  END IF;

  INSERT INTO public.user_owned_styles (user_id, style_id, obtained_via)
  VALUES (uid, style_id, 'booster');

  RETURN jsonb_build_object('granted_style_id', style_id, 'refund_coins', 0);
END;
$$;
GRANT EXECUTE ON FUNCTION public.process_booster_style_drop() TO authenticated;

-- Allow service role to insert into user_owned_styles (for RPC) — RPC runs as DEFINER so it uses same role that created the function; INSERT policy was WITH CHECK (false) so only the function can insert. We need the function to insert. Actually the function runs as SECURITY DEFINER so it runs with the owner of the function (superuser or postgres), so it can insert. So we're good.

-- Ensure user_purchased_boosters can be updated by the RPC (owner). Insert is done in add_purchased_boosters, update in consume. Both are in SECURITY DEFINER functions so they bypass RLS. We need one policy to allow SELECT for the user so the app can read pending_count. We have that. Done.
