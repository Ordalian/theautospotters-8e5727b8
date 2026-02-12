-- Drop the overly permissive SELECT policy on cars
DROP POLICY IF EXISTS "Authenticated users can view all cars" ON public.cars;

-- Create a new policy: users can see their own cars + accepted friends' cars
CREATE POLICY "Users can view own and friends cars"
ON public.cars
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
    AND (
      (requester_id = auth.uid() AND addressee_id = cars.user_id)
      OR (addressee_id = auth.uid() AND requester_id = cars.user_id)
    )
  )
);