-- Add condition to user_game_cards (card instance condition when obtained)
ALTER TABLE public.user_game_cards
  ADD COLUMN IF NOT EXISTS condition text
  CHECK (condition IN ('damaged', 'average', 'good', 'perfect'))
  DEFAULT 'good';
