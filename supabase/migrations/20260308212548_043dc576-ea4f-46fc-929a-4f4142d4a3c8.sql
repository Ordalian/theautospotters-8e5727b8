
-- =====================================================
-- FIX: Set search_path on all functions missing it
-- =====================================================

-- 1. owned_vehicles_validate_car_owner
CREATE OR REPLACE FUNCTION public.owned_vehicles_validate_car_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.car_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.cars c WHERE c.id = NEW.car_id AND c.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'owned_vehicles: car_id must belong to the same user_id';
  END IF;
  RETURN NEW;
END;
$$;

-- 2. normalize_license_plate
CREATE OR REPLACE FUNCTION public.normalize_license_plate(plate text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT upper(regexp_replace(regexp_replace(COALESCE(trim(plate), ''), '\s', '', 'g'), '-', '', 'g'));
$$;

-- 3. profiles_prevent_username_change_when_locked
CREATE OR REPLACE FUNCTION public.profiles_prevent_username_change_when_locked()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.username_locked AND (NEW.username IS DISTINCT FROM OLD.username) THEN
    RAISE EXCEPTION 'Username cannot be changed after it has been set once.';
  END IF;
  RETURN NEW;
END;
$$;

-- 4. spotter_level_from_count
CREATE OR REPLACE FUNCTION public.spotter_level_from_count(p_count bigint)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  c int := LEAST(2147483647, GREATEST(0, p_count::int));
BEGIN
  IF c >= 20000 THEN RETURN 10; END IF;
  IF c >= 10000 THEN RETURN 9; END IF;
  IF c >= 5000 THEN RETURN 8; END IF;
  IF c >= 2000 THEN RETURN 7; END IF;
  IF c >= 1000 THEN RETURN 6; END IF;
  IF c >= 500 THEN RETURN 5; END IF;
  IF c >= 100 THEN RETURN 4; END IF;
  IF c >= 50 THEN RETURN 3; END IF;
  IF c >= 10 THEN RETURN 2; END IF;
  IF c >= 5 THEN RETURN 1; END IF;
  RETURN 0;
END;
$$;

-- 5. achievement_xp_for_level
CREATE OR REPLACE FUNCTION public.achievement_xp_for_level(p_level integer)
RETURNS bigint
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN CASE LEAST(10, GREATEST(0, p_level))
    WHEN 1 THEN 100
    WHEN 2 THEN 200
    WHEN 3 THEN 400
    WHEN 4 THEN 800
    WHEN 5 THEN 1500
    WHEN 6 THEN 2000
    WHEN 7 THEN 2500
    WHEN 8 THEN 3000
    WHEN 9 THEN 3500
    WHEN 10 THEN 5000
    ELSE 0
  END;
END;
$$;

-- 6. total_achievement_xp_for_spotter
CREATE OR REPLACE FUNCTION public.total_achievement_xp_for_spotter(p_spot_count bigint)
RETURNS bigint
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  lvl int;
  total bigint := 0;
  i int;
BEGIN
  lvl := public.spotter_level_from_count(p_spot_count);
  FOR i IN 1..lvl LOOP
    total := total + public.achievement_xp_for_level(i);
  END LOOP;
  RETURN total;
END;
$$;

-- 7. xp_for_car
CREATE OR REPLACE FUNCTION public.xp_for_car(p_vehicle_type text, p_photo_source text, p_rarity_rating integer)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  rarity int;
  base_xp int;
BEGIN
  IF p_vehicle_type = 'hot_wheels' THEN
    RETURN 0;
  END IF;
  rarity := LEAST(10, GREATEST(1, COALESCE(p_rarity_rating, 5)));
  base_xp := 10 + rarity;
  IF p_photo_source IN ('gallery_blurry', 'gallery_clear') THEN
    RETURN (base_xp / 2);
  END IF;
  IF p_photo_source IN ('camera_clear', 'camera_blurry') OR p_photo_source IS NULL THEN
    RETURN base_xp;
  END IF;
  RETURN 0;
END;
$$;
