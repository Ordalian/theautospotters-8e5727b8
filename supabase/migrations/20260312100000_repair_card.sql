-- Repair card: spend coins to improve one user_game_cards instance condition
-- Cost: 10 coins per level (damaged→average, average→good), 15 for last (good→perfect)

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
  UPDATE public.user_game_cards SET condition = next_condition WHERE id = p_user_game_card_id;

  RETURN jsonb_build_object('ok', true, 'new_condition', next_condition, 'cost', cost);
END;
$$;
GRANT EXECUTE ON FUNCTION public.repair_card(uuid) TO authenticated;
