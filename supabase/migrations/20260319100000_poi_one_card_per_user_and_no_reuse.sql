-- World Domination: 1 card per user per POI; a card in a POI cannot be used in another POI.

CREATE OR REPLACE FUNCTION public.poi_battle_cards_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  card_cond text;
  card_uses int;
  existing_count int;
  in_other_battle boolean;
BEGIN
  -- Existing: reject destroyed/damaged with 0 uses
  SELECT condition, damaged_uses_remaining INTO card_cond, card_uses
  FROM user_game_cards
  WHERE id = NEW.user_game_card_id;
  IF card_cond = 'destroyed' THEN
    RAISE EXCEPTION 'card_destroyed';
  END IF;
  IF card_cond = 'damaged' AND (card_uses IS NULL OR card_uses <= 0) THEN
    RAISE EXCEPTION 'card_destroyed';
  END IF;

  -- New: at most 1 card per user per battle
  SELECT COUNT(*) INTO existing_count
  FROM poi_battle_cards
  WHERE battle_id = NEW.battle_id AND user_id = NEW.user_id;
  IF existing_count >= 1 THEN
    RAISE EXCEPTION 'one_card_per_user_per_poi';
  END IF;

  -- New: card must not be in another unresolved battle
  SELECT EXISTS (
    SELECT 1
    FROM poi_battle_cards c
    JOIN poi_battles b ON b.id = c.battle_id
    WHERE c.user_game_card_id = NEW.user_game_card_id
      AND b.resolved = false
      AND c.battle_id <> NEW.battle_id
  ) INTO in_other_battle;
  IF in_other_battle THEN
    RAISE EXCEPTION 'card_already_in_another_poi';
  END IF;

  RETURN NEW;
END;
$$;
