-- Reward users who took part in a successful POI defense or attack: 80 coins + 100 XP each.

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

    -- Reward each user who placed a card on the winning team: 80 coins + 100 XP
    UPDATE public.profiles
    SET coins = COALESCE(coins, 0) + 80
    WHERE user_id IN (
      SELECT DISTINCT user_id FROM poi_battle_cards
      WHERE battle_id = p_battle_id AND team_color = winner
    );
    UPDATE public.profiles
    SET total_xp = COALESCE(total_xp, 0) + 100
    WHERE user_id IN (
      SELECT DISTINCT user_id FROM poi_battle_cards
      WHERE battle_id = p_battle_id AND team_color = winner
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'winner', winner, 'phase', battle.phase);
END;
$$;
