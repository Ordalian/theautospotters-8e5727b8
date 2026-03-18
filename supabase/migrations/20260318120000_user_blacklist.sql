-- User blacklist: full isolation between two users (no DMs, no garage/cards visibility).
-- A blacklisted user cannot be unblacklisted before 24h (enforced in app; DB stores created_at).

CREATE TABLE public.user_blacklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blacklisted_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_blacklist_no_self CHECK (user_id != blacklisted_user_id),
  CONSTRAINT user_blacklist_unique UNIQUE (user_id, blacklisted_user_id)
);

CREATE INDEX idx_user_blacklist_user_id ON public.user_blacklist(user_id);
CREATE INDEX idx_user_blacklist_blacklisted_user_id ON public.user_blacklist(blacklisted_user_id);

ALTER TABLE public.user_blacklist ENABLE ROW LEVEL SECURITY;

-- Users can only see their own blacklist rows (where they are user_id)
CREATE POLICY "Users can view own blacklist"
ON public.user_blacklist FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own blacklist"
ON public.user_blacklist FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own blacklist"
ON public.user_blacklist FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Helper: true if either user has blacklisted the other
CREATE OR REPLACE FUNCTION public.is_blacklisted(uid_a uuid, uid_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_blacklist b
    WHERE (b.user_id = uid_a AND b.blacklisted_user_id = uid_b)
       OR (b.user_id = uid_b AND b.blacklisted_user_id = uid_a)
  );
$$;

-- Cars: exclude blacklisted from friend visibility
DROP POLICY IF EXISTS "Users can view own and friends cars" ON public.cars;
CREATE POLICY "Users can view own and friends cars"
ON public.cars FOR SELECT
USING (
  auth.uid() = user_id
  OR (
    NOT public.is_blacklisted(auth.uid(), user_id)
    AND EXISTS (
      SELECT 1 FROM public.friendships
      WHERE status = 'accepted'
      AND (
        (requester_id = auth.uid() AND addressee_id = cars.user_id)
        OR (addressee_id = auth.uid() AND requester_id = cars.user_id)
      )
    )
  )
);

-- car_photos: friends view — exclude blacklisted
DROP POLICY IF EXISTS "Friends can view car_photos of friends cars" ON public.car_photos;
CREATE POLICY "Friends can view car_photos of friends cars"
ON public.car_photos FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.cars c
    JOIN public.friendships f ON (
      (f.requester_id = auth.uid() AND f.addressee_id = c.user_id AND f.status = 'accepted')
      OR (f.addressee_id = auth.uid() AND f.requester_id = c.user_id AND f.status = 'accepted')
    )
    WHERE c.id = car_photos.car_id
      AND NOT public.is_blacklisted(auth.uid(), c.user_id)
  )
);

-- garage_groups: friends view — exclude blacklisted
DROP POLICY IF EXISTS "Friends can view friend garage_groups" ON public.garage_groups;
CREATE POLICY "Friends can view friend garage_groups"
ON public.garage_groups FOR SELECT TO authenticated
USING (
  NOT public.is_blacklisted(auth.uid(), garage_groups.user_id)
  AND EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
    AND (
      (f.requester_id = auth.uid() AND f.addressee_id = garage_groups.user_id)
      OR (f.addressee_id = auth.uid() AND f.requester_id = garage_groups.user_id)
    )
  )
);

-- user_game_cards: friends view — exclude blacklisted
DROP POLICY IF EXISTS "Friends can view friend game cards" ON public.user_game_cards;
CREATE POLICY "Friends can view friend game cards"
ON public.user_game_cards FOR SELECT TO authenticated
USING (
  NOT public.is_blacklisted(auth.uid(), user_game_cards.user_id)
  AND EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
    AND ((f.requester_id = auth.uid() AND f.addressee_id = user_game_cards.user_id)
      OR (f.addressee_id = auth.uid() AND f.requester_id = user_game_cards.user_id))
  )
);

-- direct_messages INSERT: do not allow sending to blacklisted
DROP POLICY IF EXISTS "Users can send DMs to friends" ON public.direct_messages;
CREATE POLICY "Users can send DMs to friends"
ON public.direct_messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND NOT public.is_blacklisted(auth.uid(), receiver_id)
  AND EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
    AND (
      (f.requester_id = auth.uid() AND f.addressee_id = direct_messages.receiver_id)
      OR (f.addressee_id = auth.uid() AND f.requester_id = direct_messages.receiver_id)
    )
  )
);

-- car_likes: only see likes on cars we can view (including blacklist)
DROP POLICY IF EXISTS "Users can view likes on accessible cars" ON public.car_likes;
CREATE POLICY "Users can view likes on accessible cars"
ON public.car_likes FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.cars c
    WHERE c.id = car_likes.car_id
    AND (
      c.user_id = auth.uid()
      OR (
        NOT public.is_blacklisted(auth.uid(), c.user_id)
        AND EXISTS (
          SELECT 1 FROM public.friendships f
          WHERE f.status = 'accepted'
          AND ((f.requester_id = auth.uid() AND f.addressee_id = c.user_id)
            OR (f.addressee_id = auth.uid() AND f.requester_id = c.user_id))
        )
      )
    )
  )
);
