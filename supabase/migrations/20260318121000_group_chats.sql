-- Group chats (text-only MVP)

CREATE TABLE public.group_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  last_message_at timestamptz
);

CREATE INDEX idx_group_chats_last_message_at ON public.group_chats(last_message_at DESC);
CREATE INDEX idx_group_chats_created_by ON public.group_chats(created_by);

CREATE TABLE public.group_chat_members (
  chat_id uuid NOT NULL REFERENCES public.group_chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  PRIMARY KEY (chat_id, user_id)
);

CREATE INDEX idx_group_chat_members_user_id ON public.group_chat_members(user_id);

CREATE TABLE public.group_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.group_chats(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_group_chat_messages_chat_id_created_at ON public.group_chat_messages(chat_id, created_at DESC);

ALTER TABLE public.group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_chat_messages ENABLE ROW LEVEL SECURITY;

-- Helper: is active member
CREATE OR REPLACE FUNCTION public.is_group_chat_member(p_chat_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_chat_members m
    WHERE m.chat_id = p_chat_id
      AND m.user_id = p_user_id
      AND m.left_at IS NULL
  );
$$;

-- Helper: is owner
CREATE OR REPLACE FUNCTION public.is_group_chat_owner(p_chat_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_chat_members m
    WHERE m.chat_id = p_chat_id
      AND m.user_id = p_user_id
      AND m.left_at IS NULL
      AND m.role = 'owner'
  );
$$;

-- group_chats
CREATE POLICY "Members can view group chats"
ON public.group_chats FOR SELECT TO authenticated
USING (public.is_group_chat_member(id, auth.uid()));

CREATE POLICY "Users can create group chats"
ON public.group_chats FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

-- group_chat_members
CREATE POLICY "Members can view group members"
ON public.group_chat_members FOR SELECT TO authenticated
USING (public.is_group_chat_member(chat_id, auth.uid()));

-- Owners can add members. On create, creator can add self as owner because created_by matches.
CREATE POLICY "Owners can add members"
ON public.group_chat_members FOR INSERT TO authenticated
WITH CHECK (
  (
    public.is_group_chat_owner(chat_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.group_chats c WHERE c.id = chat_id AND c.created_by = auth.uid())
  )
  AND (
    (role = 'owner' AND user_id = auth.uid())
    OR role = 'member'
  )
  -- blacklist: do not allow adding if any existing member is blacklisted with the new member
  AND NOT EXISTS (
    SELECT 1
    FROM public.group_chat_members m
    WHERE m.chat_id = group_chat_members.chat_id
      AND m.left_at IS NULL
      AND public.is_blacklisted(m.user_id, group_chat_members.user_id)
  )
);

-- Leave chat: user can set their own left_at
CREATE POLICY "Users can leave group chats"
ON public.group_chat_members FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND public.is_group_chat_member(chat_id, auth.uid()))
WITH CHECK (auth.uid() = user_id);

-- Owner can remove member by setting left_at
CREATE POLICY "Owners can remove members"
ON public.group_chat_members FOR UPDATE TO authenticated
USING (public.is_group_chat_owner(chat_id, auth.uid()))
WITH CHECK (public.is_group_chat_owner(chat_id, auth.uid()));

-- group_chat_messages
CREATE POLICY "Members can view group messages"
ON public.group_chat_messages FOR SELECT TO authenticated
USING (public.is_group_chat_member(chat_id, auth.uid()));

CREATE POLICY "Members can send group messages"
ON public.group_chat_messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND public.is_group_chat_member(chat_id, auth.uid())
  AND NOT EXISTS (
    SELECT 1
    FROM public.group_chat_members m
    WHERE m.chat_id = group_chat_messages.chat_id
      AND m.left_at IS NULL
      AND public.is_blacklisted(m.user_id, auth.uid())
  )
);

-- Maintain last_message_at
CREATE OR REPLACE FUNCTION public.tg_group_chat_touch_last_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.group_chats
  SET last_message_at = NEW.created_at
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_group_chat_touch_last_message ON public.group_chat_messages;
CREATE TRIGGER trg_group_chat_touch_last_message
AFTER INSERT ON public.group_chat_messages
FOR EACH ROW EXECUTE FUNCTION public.tg_group_chat_touch_last_message();

