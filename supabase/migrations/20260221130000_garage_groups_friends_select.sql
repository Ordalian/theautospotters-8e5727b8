-- Allow users to see a friend's garage groups when viewing their garage (for sort by group)
CREATE POLICY "Friends can view friend garage_groups"
  ON public.garage_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
        AND ( (f.requester_id = auth.uid() AND f.addressee_id = garage_groups.user_id)
           OR (f.addressee_id = auth.uid() AND f.requester_id = garage_groups.user_id) )
    )
  );
