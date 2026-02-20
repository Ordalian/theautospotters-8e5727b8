-- Allow inserting a car for a friend during delivery (where delivered_by_user_id = auth.uid())
DROP POLICY "Users can insert own cars" ON public.cars;

CREATE POLICY "Users can insert own cars or deliver to friends"
ON public.cars
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  OR (
    delivered_by_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
      AND (
        (requester_id = auth.uid() AND addressee_id = cars.user_id)
        OR (addressee_id = auth.uid() AND requester_id = cars.user_id)
      )
    )
  )
);