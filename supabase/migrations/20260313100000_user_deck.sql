-- Deck builder: one deck per user, up to 12 card instance ids (user_game_cards.id)
-- Point limit (30) and card limit (12) enforced in app; DB only enforces array length

CREATE TABLE public.user_deck (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  card_ids uuid[] NOT NULL DEFAULT '{}' CHECK (array_length(card_ids, 1) IS NULL OR array_length(card_ids, 1) <= 12),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_deck ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own deck"
  ON public.user_deck FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deck"
  ON public.user_deck FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own deck"
  ON public.user_deck FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_deck_user ON public.user_deck(user_id);
