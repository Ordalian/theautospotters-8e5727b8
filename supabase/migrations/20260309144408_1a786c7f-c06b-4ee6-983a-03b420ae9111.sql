
-- Master card pool (200 cards)
CREATE TABLE public.game_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  brand text NOT NULL,
  model text NOT NULL,
  archetype text NOT NULL CHECK (archetype IN ('speed', 'resilience', 'adaptability', 'power')),
  rarity text NOT NULL CHECK (rarity IN ('common', 'uncommon', 'rare', 'mythic')),
  speed integer NOT NULL CHECK (speed BETWEEN 1 AND 10),
  resilience integer NOT NULL CHECK (resilience BETWEEN 1 AND 10),
  adaptability integer NOT NULL CHECK (adaptability BETWEEN 1 AND 10),
  power integer NOT NULL CHECK (power BETWEEN 1 AND 10),
  hp integer NOT NULL,
  image_url text
);

ALTER TABLE public.game_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read game_cards"
  ON public.game_cards FOR SELECT TO authenticated
  USING (true);

-- User's card collection
CREATE TABLE public.user_game_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  card_id uuid NOT NULL REFERENCES public.game_cards(id) ON DELETE CASCADE,
  obtained_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_game_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own game cards"
  ON public.user_game_cards FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own game cards"
  ON public.user_game_cards FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_user_game_cards_user ON public.user_game_cards(user_id);

-- Booster cooldown
CREATE TABLE public.user_booster_cooldown (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  last_opened_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_booster_cooldown ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own cooldown"
  ON public.user_booster_cooldown FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cooldown"
  ON public.user_booster_cooldown FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cooldown"
  ON public.user_booster_cooldown FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
