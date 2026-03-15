
-- Fix "Founder can update any profile role" - replace WITH CHECK (true) with proper check
DROP POLICY IF EXISTS "Founder can update any profile role" ON public.profiles;

CREATE POLICY "Founder can update any profile role" ON public.profiles
  FOR UPDATE TO public
  USING (
    (SELECT p.role FROM public.profiles p WHERE p.user_id = auth.uid()) = 'founder'
  )
  WITH CHECK (
    (SELECT p.role FROM public.profiles p WHERE p.user_id = auth.uid()) = 'founder'
  );
