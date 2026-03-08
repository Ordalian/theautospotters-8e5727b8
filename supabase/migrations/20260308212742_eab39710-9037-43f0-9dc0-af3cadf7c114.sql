
-- FIX: car_likes SELECT — only see likes on cars you can view
DROP POLICY IF EXISTS "Authenticated users can view likes" ON public.car_likes;
CREATE POLICY "Users can view likes on accessible cars"
ON public.car_likes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.cars c
    WHERE c.id = car_likes.car_id
      AND (
        c.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.friendships f
          WHERE f.status = 'accepted'
            AND ((f.requester_id = auth.uid() AND f.addressee_id = c.user_id)
              OR (f.addressee_id = auth.uid() AND f.requester_id = c.user_id))
        )
      )
  )
);

-- FIX: profiles SELECT — create a public view hiding sensitive fields
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT user_id, username, avatar_url, total_xp,
       emblem_slot_1, emblem_slot_2, emblem_slot_3,
       pinned_car_id, created_at
FROM public.profiles;

-- channel_topics SELECT: already uses 'true' which is fine for public channels
-- notifications: already restricted to own user
