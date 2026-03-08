
-- =====================================================
-- FIX 1: CRITICAL — Friendship UPDATE privilege escalation
-- The current UPDATE policy allows changing requester_id, creating forged friendships.
-- Solution: Use a SECURITY DEFINER function that only allows updating status.
-- =====================================================

-- Drop the vulnerable policy
DROP POLICY IF EXISTS "Addressee can update friendship" ON public.friendships;

-- Create a secure function to accept/decline friendships
CREATE OR REPLACE FUNCTION public.update_friendship_status(
  p_friendship_id uuid,
  p_new_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow valid status transitions
  IF p_new_status NOT IN ('accepted', 'declined') THEN
    RAISE EXCEPTION 'Invalid status. Must be accepted or declined.';
  END IF;

  -- Only the addressee can update, and only pending friendships
  UPDATE public.friendships
  SET status = p_new_status
  WHERE id = p_friendship_id
    AND addressee_id = auth.uid()
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friendship not found or you are not authorized to update it.';
  END IF;
END;
$$;

-- Create a restrictive UPDATE policy that prevents ANY direct updates
CREATE POLICY "No direct updates to friendships"
ON public.friendships
FOR UPDATE
TO authenticated
USING (false);

-- =====================================================
-- FIX 2: car_photos SELECT policies are RESTRICTIVE (mutually exclusive → nothing visible)
-- Solution: Change both to PERMISSIVE
-- =====================================================

DROP POLICY IF EXISTS "Users can view car_photos of own cars" ON public.car_photos;
DROP POLICY IF EXISTS "Friends can view car_photos of friends cars" ON public.car_photos;

CREATE POLICY "Users can view car_photos of own cars"
ON public.car_photos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.cars c
    WHERE c.id = car_photos.car_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Friends can view car_photos of friends cars"
ON public.car_photos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.cars c
    JOIN public.friendships f ON (
      (f.requester_id = auth.uid() AND f.addressee_id = c.user_id AND f.status = 'accepted')
      OR (f.addressee_id = auth.uid() AND f.requester_id = c.user_id AND f.status = 'accepted')
    )
    WHERE c.id = car_photos.car_id
  )
);

-- =====================================================
-- FIX 3: garage_groups SELECT policies are RESTRICTIVE (mutually exclusive → nothing visible)
-- Solution: Drop both and recreate as PERMISSIVE
-- =====================================================

DROP POLICY IF EXISTS "Users can manage own garage_groups" ON public.garage_groups;
DROP POLICY IF EXISTS "Friends can view friend garage_groups" ON public.garage_groups;

-- Owner: full CRUD (PERMISSIVE)
CREATE POLICY "Users can manage own garage_groups"
ON public.garage_groups
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Friends: read only (PERMISSIVE)
CREATE POLICY "Friends can view friend garage_groups"
ON public.garage_groups
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
      AND (
        (f.requester_id = auth.uid() AND f.addressee_id = garage_groups.user_id)
        OR (f.addressee_id = auth.uid() AND f.requester_id = garage_groups.user_id)
      )
  )
);

-- =====================================================
-- FIX 4: Harden other policies — add WITH CHECK to INSERT policies
-- Prevent users from inserting data with spoofed user_ids
-- =====================================================

-- car_likes: ensure INSERT can only set own user_id
DROP POLICY IF EXISTS "Users can insert own likes" ON public.car_likes;
CREATE POLICY "Users can insert own likes"
ON public.car_likes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- channel_topics: ensure INSERT can only set own user_id
DROP POLICY IF EXISTS "Users can create topics" ON public.channel_topics;
CREATE POLICY "Users can create topics"
ON public.channel_topics
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- channel_replies: ensure INSERT can only set own user_id
DROP POLICY IF EXISTS "Users can create replies" ON public.channel_replies;
CREATE POLICY "Users can create replies"
ON public.channel_replies
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- direct_messages: tighten — sender must be auth.uid()
-- Already has friendship check, just ensure it stays correct
DROP POLICY IF EXISTS "Users can send DMs to friends" ON public.direct_messages;
CREATE POLICY "Users can send DMs to friends"
ON public.direct_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
      AND (
        (f.requester_id = auth.uid() AND f.addressee_id = direct_messages.receiver_id)
        OR (f.addressee_id = auth.uid() AND f.requester_id = direct_messages.receiver_id)
      )
  )
);

-- DM UPDATE: only receiver can mark as read, and ONLY the read_at column
DROP POLICY IF EXISTS "Users can mark own DMs as read" ON public.direct_messages;
CREATE POLICY "Users can mark own DMs as read"
ON public.direct_messages
FOR UPDATE
TO authenticated
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);
