-- Leveling: levels 0–100, total_xp on profiles, XP from spots (camera full, gallery half, miniatures 0)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_xp bigint NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.profiles.total_xp IS 'Total experience from spots (camera: 10+rarity, gallery: half, miniatures: 0)';

-- XP for one car: 0 if hot_wheels; else full (10+rarity) for camera_*, half for gallery_*, 0 for none
CREATE OR REPLACE FUNCTION public.xp_for_car(
  p_vehicle_type text,
  p_photo_source text,
  p_rarity_rating integer
) RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
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

-- Recompute total_xp for a user from their cars
CREATE OR REPLACE FUNCTION public.recompute_user_total_xp(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET total_xp = COALESCE(
    (SELECT SUM(public.xp_for_car(c.vehicle_type, c.photo_source, c.rarity_rating))::bigint
     FROM public.cars c
     WHERE c.user_id = p_user_id),
    0
  )
  WHERE user_id = p_user_id;
END;
$$;

-- Trigger: on cars insert/update/delete, update the owner's total_xp
CREATE OR REPLACE FUNCTION public.cars_sync_total_xp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  old_xp int;
  new_xp int;
BEGIN
  IF TG_OP = 'DELETE' THEN
    uid := OLD.user_id;
    old_xp := public.xp_for_car(OLD.vehicle_type, OLD.photo_source, OLD.rarity_rating);
    UPDATE public.profiles
    SET total_xp = GREATEST(0, total_xp - old_xp)
    WHERE user_id = uid;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    uid := NEW.user_id;
    new_xp := public.xp_for_car(NEW.vehicle_type, NEW.photo_source, NEW.rarity_rating);
    UPDATE public.profiles
    SET total_xp = total_xp + new_xp
    WHERE user_id = uid;
    RETURN NEW;
  END IF;

  -- UPDATE
  uid := NEW.user_id;
  old_xp := public.xp_for_car(OLD.vehicle_type, OLD.photo_source, OLD.rarity_rating);
  new_xp := public.xp_for_car(NEW.vehicle_type, NEW.photo_source, NEW.rarity_rating);
  UPDATE public.profiles
  SET total_xp = GREATEST(0, total_xp - old_xp + new_xp)
  WHERE user_id = uid;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cars_sync_total_xp_trigger ON public.cars;
CREATE TRIGGER cars_sync_total_xp_trigger
  AFTER INSERT OR UPDATE OF vehicle_type, photo_source, rarity_rating OR DELETE
  ON public.cars
  FOR EACH ROW
  EXECUTE FUNCTION public.cars_sync_total_xp();

-- Backfill total_xp for all existing users
SELECT public.recompute_user_total_xp(user_id) FROM public.profiles;
