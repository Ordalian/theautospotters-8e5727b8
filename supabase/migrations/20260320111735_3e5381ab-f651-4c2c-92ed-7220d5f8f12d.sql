
-- Daily streaks table
CREATE TABLE public.daily_streaks (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_claim_date date,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own streak"
  ON public.daily_streaks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own streak"
  ON public.daily_streaks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- No direct update — use RPC
CREATE POLICY "No direct update streak"
  ON public.daily_streaks FOR UPDATE
  TO authenticated
  USING (false);

-- Add hide_email to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hide_email boolean NOT NULL DEFAULT false;

-- RPC to claim daily streak
CREATE OR REPLACE FUNCTION public.claim_daily_streak()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_today date := CURRENT_DATE;
  v_row daily_streaks%ROWTYPE;
  v_new_streak integer;
  v_xp_reward integer;
  v_longest integer;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'not_authenticated');
  END IF;

  -- Get or create streak row
  SELECT * INTO v_row FROM daily_streaks WHERE user_id = v_user_id;
  
  IF v_row IS NULL THEN
    INSERT INTO daily_streaks (user_id, current_streak, longest_streak, last_claim_date)
    VALUES (v_user_id, 1, 1, v_today);
    -- Day 1 = 100 XP
    PERFORM increment_total_xp(100, 'daily_streak');
    RETURN json_build_object('streak', 1, 'xp', 100, 'already_claimed', false);
  END IF;

  -- Already claimed today
  IF v_row.last_claim_date = v_today THEN
    RETURN json_build_object('streak', v_row.current_streak, 'xp', 0, 'already_claimed', true);
  END IF;

  -- Check if yesterday (continues streak) or gap (resets)
  IF v_row.last_claim_date = v_today - 1 THEN
    v_new_streak := v_row.current_streak + 1;
  ELSE
    v_new_streak := 1;
  END IF;

  -- Cap at 7, then reset cycle
  IF v_new_streak > 7 THEN
    v_new_streak := 1;
  END IF;

  -- XP: day 7 = 500, others = 100
  IF v_new_streak = 7 THEN
    v_xp_reward := 500;
  ELSE
    v_xp_reward := 100;
  END IF;

  v_longest := GREATEST(v_row.longest_streak, v_new_streak);

  UPDATE daily_streaks
  SET current_streak = v_new_streak,
      longest_streak = v_longest,
      last_claim_date = v_today,
      updated_at = now()
  WHERE user_id = v_user_id;

  PERFORM increment_total_xp(v_xp_reward, 'daily_streak');

  RETURN json_build_object('streak', v_new_streak, 'xp', v_xp_reward, 'already_claimed', false);
END;
$$;

-- RPC to get streak status without claiming
CREATE OR REPLACE FUNCTION public.get_daily_streak()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_row daily_streaks%ROWTYPE;
  v_today date := CURRENT_DATE;
  v_effective_streak integer;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'not_authenticated');
  END IF;

  SELECT * INTO v_row FROM daily_streaks WHERE user_id = v_user_id;
  
  IF v_row IS NULL THEN
    RETURN json_build_object('streak', 0, 'claimed_today', false, 'longest', 0);
  END IF;

  -- If last claim was before yesterday, streak is broken
  IF v_row.last_claim_date < v_today - 1 THEN
    v_effective_streak := 0;
  ELSE
    v_effective_streak := v_row.current_streak;
  END IF;

  RETURN json_build_object(
    'streak', v_effective_streak,
    'claimed_today', v_row.last_claim_date = v_today,
    'longest', v_row.longest_streak
  );
END;
$$;
