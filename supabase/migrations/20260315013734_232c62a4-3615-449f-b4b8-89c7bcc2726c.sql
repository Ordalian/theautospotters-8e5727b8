
-- Drop the existing permissive self-update policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Recreate with explicit WITH CHECK that blocks sensitive column changes
-- The trigger is the primary guard; this WITH CHECK adds defense-in-depth
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO public
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND role = (SELECT p.role FROM public.profiles p WHERE p.user_id = auth.uid())
    AND coins = (SELECT p.coins FROM public.profiles p WHERE p.user_id = auth.uid())
    AND is_premium = (SELECT p.is_premium FROM public.profiles p WHERE p.user_id = auth.uid())
    AND premium_until IS NOT DISTINCT FROM (SELECT p.premium_until FROM public.profiles p WHERE p.user_id = auth.uid())
    AND is_map_marker = (SELECT p.is_map_marker FROM public.profiles p WHERE p.user_id = auth.uid())
    AND username_locked = (SELECT p.username_locked FROM public.profiles p WHERE p.user_id = auth.uid())
    AND is_temp = (SELECT p.is_temp FROM public.profiles p WHERE p.user_id = auth.uid())
    AND temp_expires_at IS NOT DISTINCT FROM (SELECT p.temp_expires_at FROM public.profiles p WHERE p.user_id = auth.uid())
    AND total_xp = (SELECT p.total_xp FROM public.profiles p WHERE p.user_id = auth.uid())
    AND flagged_for_deletion = (SELECT p.flagged_for_deletion FROM public.profiles p WHERE p.user_id = auth.uid())
    AND flagged_by IS NOT DISTINCT FROM (SELECT p.flagged_by FROM public.profiles p WHERE p.user_id = auth.uid())
  );
