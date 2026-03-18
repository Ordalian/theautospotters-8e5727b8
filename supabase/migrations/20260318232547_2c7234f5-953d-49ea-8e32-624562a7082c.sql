
-- Add tryout user support columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_tryout boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tryout_expires_at timestamptz;

-- Update profiles_protect_columns trigger to protect tryout columns
CREATE OR REPLACE FUNCTION public.profiles_protect_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  IF public.is_staff(auth.uid()) THEN
    RETURN NEW;
  END IF;
  NEW.role := OLD.role;
  NEW.coins := OLD.coins;
  NEW.is_premium := OLD.is_premium;
  NEW.premium_until := OLD.premium_until;
  NEW.username_locked := OLD.username_locked;
  NEW.is_temp := OLD.is_temp;
  NEW.temp_expires_at := OLD.temp_expires_at;
  NEW.is_map_marker := OLD.is_map_marker;
  NEW.total_xp := OLD.total_xp;
  NEW.is_tryout := OLD.is_tryout;
  NEW.tryout_expires_at := OLD.tryout_expires_at;
  RETURN NEW;
END;
$$;

-- Update the user_can_manage_pois to also check is_map_marker field
-- (already exists, no change needed)

-- RLS for user_blacklist already covers INSERT/SELECT/DELETE for own rows
