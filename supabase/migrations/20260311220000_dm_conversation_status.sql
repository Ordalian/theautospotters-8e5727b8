-- ============================================================
-- DM conversation status: accept/block non-friend conversations
-- ============================================================

CREATE TABLE IF NOT EXISTS dm_conversation_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  other_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, other_user_id)
);

ALTER TABLE dm_conversation_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversation statuses"
  ON dm_conversation_status FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversation statuses"
  ON dm_conversation_status FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversation statuses"
  ON dm_conversation_status FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_dm_conv_status_user ON dm_conversation_status(user_id);
CREATE INDEX idx_dm_conv_status_pair ON dm_conversation_status(user_id, other_user_id);
