
-- Allow all authenticated users to view all cars (for shared map + friends)
CREATE POLICY "Authenticated users can view all cars"
ON public.cars FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- Drop the restrictive owner-only SELECT policy
DROP POLICY "Users can view own cars" ON public.cars;

-- Friendships table
CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  addressee_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(requester_id, addressee_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own friendships"
ON public.friendships FOR SELECT TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can send friend requests"
ON public.friendships FOR INSERT TO authenticated
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Addressee can update friendship"
ON public.friendships FOR UPDATE TO authenticated
USING (auth.uid() = addressee_id);

CREATE POLICY "Either party can delete friendship"
ON public.friendships FOR DELETE TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
