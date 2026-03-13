-- Allow up to 3 named decks per user
-- Each deck has an index (1..3), a name, and card_ids (user_game_cards.id[])

ALTER TABLE public.user_deck
  DROP CONSTRAINT IF EXISTS user_deck_pkey;

ALTER TABLE public.user_deck
  ADD COLUMN IF NOT EXISTS deck_index smallint NOT NULL DEFAULT 1 CHECK (deck_index BETWEEN 1 AND 3),
  ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT 'Deck 1';

ALTER TABLE public.user_deck
  ADD CONSTRAINT user_deck_pkey PRIMARY KEY (user_id, deck_index);

