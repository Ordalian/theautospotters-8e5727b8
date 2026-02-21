-- Allow profile owner to see their linked plates (UI only; RLS already restricts to own rows).
-- No schema change needed for owned_vehicles; we just show license_plate in the app for the owner.

-- Username can only be changed once after first connection
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username_locked BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.username_locked IS 'When true, username can no longer be changed by the user.';

-- Prevent updating username when username_locked is true (even via API)
CREATE OR REPLACE FUNCTION public.profiles_prevent_username_change_when_locked()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.username_locked AND (NEW.username IS DISTINCT FROM OLD.username) THEN
    RAISE EXCEPTION 'Username cannot be changed after it has been set once.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_username_locked_trigger ON public.profiles;
CREATE TRIGGER profiles_username_locked_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_prevent_username_change_when_locked();
