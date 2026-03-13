
-- 1. Fix user_deck for multi-deck support
ALTER TABLE public.user_deck DROP CONSTRAINT user_deck_pkey;
ALTER TABLE public.user_deck ADD COLUMN IF NOT EXISTS deck_index integer NOT NULL DEFAULT 1;
ALTER TABLE public.user_deck ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '';
ALTER TABLE public.user_deck ADD CONSTRAINT user_deck_pkey PRIMARY KEY (user_id, deck_index);

-- 2. Add team_color to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS team_color text;

-- 3. Create map_pois
CREATE TABLE public.map_pois (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  owner_team text,
  invulnerable_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.map_pois ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read POIs" ON public.map_pois FOR SELECT TO authenticated USING (true);

-- 4. Create poi_battles
CREATE TABLE public.poi_battles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poi_id uuid NOT NULL REFERENCES public.map_pois(id) ON DELETE CASCADE,
  phase text NOT NULL DEFAULT 'capture',
  started_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  resolved boolean NOT NULL DEFAULT false,
  winner_team text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.poi_battles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read battles" ON public.poi_battles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert battles" ON public.poi_battles FOR INSERT TO authenticated WITH CHECK (true);

-- 5. Create poi_battle_cards
CREATE TABLE public.poi_battle_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id uuid NOT NULL REFERENCES public.poi_battles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_game_card_id uuid NOT NULL REFERENCES public.user_game_cards(id),
  team_color text NOT NULL,
  side text NOT NULL DEFAULT 'attack',
  stat_value integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.poi_battle_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read battle cards" ON public.poi_battle_cards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own battle cards" ON public.poi_battle_cards FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 6. Resolve function
CREATE OR REPLACE FUNCTION public.resolve_poi_battle(p_battle_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  battle RECORD;
  poi RECORD;
  winner text;
  best_team text;
  best_score numeric := 0;
  total_attack numeric := 0;
  total_defense numeric := 0;
  team_row RECORD;
BEGIN
  SELECT * INTO battle FROM poi_battles WHERE id = p_battle_id AND resolved = false;
  IF battle IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'battle_not_found_or_resolved');
  END IF;
  
  IF battle.ends_at > now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'battle_not_ended');
  END IF;

  SELECT * INTO poi FROM map_pois WHERE id = battle.poi_id;

  IF battle.phase = 'capture' THEN
    FOR team_row IN
      SELECT bc.team_color, SUM(bc.stat_value)::numeric as score
      FROM poi_battle_cards bc
      WHERE bc.battle_id = p_battle_id
      GROUP BY bc.team_color
    LOOP
      IF team_row.score > best_score THEN
        best_score := team_row.score;
        best_team := team_row.team_color;
      END IF;
    END LOOP;
    winner := best_team;
  ELSE
    SELECT COALESCE(SUM(bc.stat_value * 1.5), 0)::numeric INTO total_defense
    FROM poi_battle_cards bc
    WHERE bc.battle_id = p_battle_id AND bc.side = 'defend';

    FOR team_row IN
      SELECT bc.team_color, SUM(bc.stat_value * 1.5)::numeric as score
      FROM poi_battle_cards bc
      WHERE bc.battle_id = p_battle_id AND bc.side = 'attack'
      GROUP BY bc.team_color
    LOOP
      total_attack := total_attack + team_row.score;
      IF team_row.score > best_score THEN
        best_score := team_row.score;
        best_team := team_row.team_color;
      END IF;
    END LOOP;

    IF total_attack > total_defense THEN
      winner := best_team;
    ELSE
      winner := poi.owner_team;
    END IF;
  END IF;

  UPDATE poi_battles SET resolved = true, winner_team = winner WHERE id = p_battle_id;

  IF winner IS NOT NULL THEN
    UPDATE map_pois SET owner_team = winner, invulnerable_until = now() + interval '12 hours' WHERE id = battle.poi_id;
  END IF;

  UPDATE user_game_cards SET condition = CASE condition
    WHEN 'perfect' THEN 'good'
    WHEN 'good' THEN 'average'
    WHEN 'average' THEN 'damaged'
    ELSE condition
  END
  WHERE id IN (SELECT user_game_card_id FROM poi_battle_cards WHERE battle_id = p_battle_id);

  RETURN jsonb_build_object('ok', true, 'winner', winner, 'phase', battle.phase);
END;
$$;
