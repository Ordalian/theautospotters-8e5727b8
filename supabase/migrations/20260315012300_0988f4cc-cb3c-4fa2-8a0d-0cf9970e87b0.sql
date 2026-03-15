
-- ============================================================
-- SECURITY HARDENING MIGRATION
-- ============================================================

-- 1. Helper: is_staff function (avoids infinite recursion in RLS)
CREATE OR REPLACE FUNCTION public.is_staff(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = p_user_id
    AND role IN ('founder', 'admin')
  );
$$;

-- 2. Recreate profiles_public view WITHOUT SECURITY DEFINER
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public AS
SELECT user_id, username, avatar_url, created_at, pinned_car_id, total_xp,
       is_premium, emblem_slot_1, emblem_slot_2, emblem_slot_3, role
FROM public.profiles;
GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- 3. Fix profiles SELECT policies (restrict to own profile + staff)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Staff can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- 4. Trigger to prevent regular users from modifying protected columns
CREATE OR REPLACE FUNCTION public.profiles_protect_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_staff(auth.uid()) THEN
    RETURN NEW;
  END IF;
  -- Reset protected columns to their original values for non-staff
  NEW.role := OLD.role;
  NEW.coins := OLD.coins;
  NEW.is_premium := OLD.is_premium;
  NEW.premium_until := OLD.premium_until;
  NEW.username_locked := OLD.username_locked;
  NEW.is_temp := OLD.is_temp;
  NEW.temp_expires_at := OLD.temp_expires_at;
  NEW.is_map_marker := OLD.is_map_marker;
  NEW.total_xp := OLD.total_xp;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_columns_trigger ON public.profiles;
CREATE TRIGGER profiles_protect_columns_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.profiles_protect_columns();

-- 5. Block direct INSERT on user_game_cards (must use RPC)
DROP POLICY IF EXISTS "Users can insert own game cards" ON public.user_game_cards;
CREATE POLICY "No direct insert game cards" ON public.user_game_cards
  FOR INSERT TO authenticated WITH CHECK (false);

-- 6. Create RPC for inserting booster cards (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.insert_booster_cards(p_card_ids uuid[], p_conditions text[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  i int;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;
  IF array_length(p_card_ids, 1) IS NULL OR array_length(p_card_ids, 1) < 1 OR array_length(p_card_ids, 1) > 5 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_count');
  END IF;
  IF array_length(p_card_ids, 1) <> array_length(p_conditions, 1) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'mismatched_arrays');
  END IF;
  FOR i IN 1..array_length(p_card_ids, 1) LOOP
    IF NOT EXISTS (SELECT 1 FROM public.game_cards WHERE id = p_card_ids[i]) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_card_id');
    END IF;
    INSERT INTO public.user_game_cards (user_id, card_id, condition)
    VALUES (uid, p_card_ids[i], COALESCE(p_conditions[i], 'good'));
  END LOOP;
  RETURN jsonb_build_object('ok', true, 'count', array_length(p_card_ids, 1));
END;
$$;

-- 7. Block direct UPDATE on user_booster_cooldown (managed by RPC functions)
DROP POLICY IF EXISTS "Users can update own cooldown" ON public.user_booster_cooldown;
CREATE POLICY "No direct update cooldown" ON public.user_booster_cooldown
  FOR UPDATE TO authenticated USING (false);

-- 8. Restrict poi_battles INSERT to map_marker / staff
DROP POLICY IF EXISTS "Authenticated can insert battles" ON public.poi_battles;
CREATE POLICY "Restricted battle creation" ON public.poi_battles
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_staff(auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_map_marker = true)
  );

-- 9. Fix map_pois UPDATE WITH CHECK to match USING
DROP POLICY IF EXISTS "Map marker and staff can update POIs" ON public.map_pois;
CREATE POLICY "Map marker and staff can update POIs" ON public.map_pois
  FOR UPDATE TO authenticated
  USING (
    public.is_staff(auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND (p.role = 'map_marker' OR p.is_map_marker = true))
  )
  WITH CHECK (
    public.is_staff(auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND (p.role = 'map_marker' OR p.is_map_marker = true))
  );
