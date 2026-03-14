-- World Domination: card conservation (1 step per use, 10 uses at damaged then destroyed), repair destroyed→good 50 coins.
-- POI: only open when user is within 500m (enforced in app).

-- 1. Add 'destroyed' to condition and add damaged_uses_remaining
ALTER TABLE public.user_game_cards
  DROP CONSTRAINT IF EXISTS user_game_cards_condition_check;

ALTER TABLE public.user_game_cards
  ADD CONSTRAINT user_game_cards_condition_check
  CHECK (condition IN ('damaged', 'average', 'good', 'perfect', 'destroyed'));

ALTER TABLE public.user_game_cards
  ADD COLUMN IF NOT EXISTS damaged_uses_remaining int NOT NULL DEFAULT 10;

COMMENT ON COLUMN public.user_game_cards.damaged_uses_remaining IS 'When condition=damaged, remaining plays before card becomes destroyed (0-10).';

-- 2. Prevent placing destroyed cards in POI battles
CREATE OR REPLACE FUNCTION public.poi_battle_cards_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  card_cond text;
  card_uses int;
BEGIN
  SELECT condition, damaged_uses_remaining INTO card_cond, card_uses
  FROM user_game_cards
  WHERE id = NEW.user_game_card_id;
  IF card_cond = 'destroyed' THEN
    RAISE EXCEPTION 'card_destroyed';
  END IF;
  IF card_cond = 'damaged' AND (card_uses IS NULL OR card_uses <= 0) THEN
    RAISE EXCEPTION 'card_destroyed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_poi_battle_cards_before_insert ON public.poi_battle_cards;
CREATE TRIGGER tr_poi_battle_cards_before_insert
  BEFORE INSERT ON public.poi_battle_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.poi_battle_cards_before_insert();

-- 3. On place: degrade card (1 conservation step; at damaged, 10 uses then destroyed)
CREATE OR REPLACE FUNCTION public.poi_battle_cards_after_insert_degrade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  card_cond text;
  card_uses int;
BEGIN
  SELECT condition, damaged_uses_remaining INTO card_cond, card_uses
  FROM user_game_cards
  WHERE id = NEW.user_game_card_id;

  IF card_cond = 'perfect' THEN
    UPDATE user_game_cards SET condition = 'good' WHERE id = NEW.user_game_card_id;
  ELSIF card_cond = 'good' THEN
    UPDATE user_game_cards SET condition = 'average' WHERE id = NEW.user_game_card_id;
  ELSIF card_cond = 'average' THEN
    UPDATE user_game_cards SET condition = 'damaged', damaged_uses_remaining = 10 WHERE id = NEW.user_game_card_id;
  ELSIF card_cond = 'damaged' THEN
    IF card_uses > 0 THEN
      UPDATE user_game_cards SET damaged_uses_remaining = damaged_uses_remaining - 1 WHERE id = NEW.user_game_card_id;
    ELSE
      UPDATE user_game_cards SET condition = 'destroyed', damaged_uses_remaining = 0 WHERE id = NEW.user_game_card_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_poi_battle_cards_after_insert_degrade ON public.poi_battle_cards;
CREATE TRIGGER tr_poi_battle_cards_after_insert_degrade
  AFTER INSERT ON public.poi_battle_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.poi_battle_cards_after_insert_degrade();

-- 4. resolve_poi_battle: stop degrading cards (degradation is on place now)
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

  -- Cards are degraded when placed (trigger), not when battle resolves
  RETURN jsonb_build_object('ok', true, 'winner', winner, 'phase', battle.phase);
END;
$$;

-- 5. Repair: destroyed → good costs 50 coins
CREATE OR REPLACE FUNCTION public.repair_card(p_user_game_card_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  rec record;
  next_condition text;
  cost int;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  SELECT id, user_id, card_id, condition INTO rec
  FROM public.user_game_cards
  WHERE id = p_user_game_card_id AND user_id = uid;

  IF rec.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'card_not_found');
  END IF;

  CASE COALESCE(rec.condition, 'good')
    WHEN 'perfect' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'already_perfect');
    WHEN 'destroyed' THEN next_condition := 'good';  cost := 50;
    WHEN 'damaged' THEN next_condition := 'average'; cost := 10;
    WHEN 'average' THEN next_condition := 'good';    cost := 10;
    WHEN 'good' THEN  next_condition := 'perfect'; cost := 15;
    ELSE
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_condition');
  END CASE;

  IF (SELECT coins FROM public.profiles WHERE user_id = uid) < cost THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_coins');
  END IF;

  UPDATE public.profiles SET coins = coins - cost WHERE user_id = uid;
  UPDATE public.user_game_cards SET condition = next_condition, damaged_uses_remaining = 10 WHERE id = p_user_game_card_id;

  RETURN jsonb_build_object('ok', true, 'new_condition', next_condition, 'cost', cost);
END;
$$;
