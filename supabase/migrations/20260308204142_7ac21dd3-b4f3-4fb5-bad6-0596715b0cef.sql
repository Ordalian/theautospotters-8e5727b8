
-- Direct messages table
CREATE TABLE public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  body text NOT NULL,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages where they are sender or receiver
CREATE POLICY "Users can view own DMs"
  ON public.direct_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can insert messages as sender (must be friends)
CREATE POLICY "Users can send DMs to friends"
  ON public.direct_messages FOR INSERT
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

-- Users can update own received messages (mark read)
CREATE POLICY "Users can mark own DMs as read"
  ON public.direct_messages FOR UPDATE
  USING (auth.uid() = receiver_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
