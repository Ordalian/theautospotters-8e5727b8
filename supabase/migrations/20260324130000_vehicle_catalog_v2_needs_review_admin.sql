-- Vehicle catalog V2: bounded generations + needs_review + admin RPCs.

-- ----------------
-- needs_review flags
-- ----------------
ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_reason text;

CREATE INDEX IF NOT EXISTS idx_cars_needs_review ON public.cars(needs_review) WHERE needs_review = true;

ALTER TABLE public.vehicle_makes ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT false;
ALTER TABLE public.vehicle_models ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT false;
ALTER TABLE public.vehicle_generations ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT false;

-- ----------------
-- Better year-range querying for generations
-- ----------------
CREATE INDEX IF NOT EXISTS idx_vehicle_generations_bounds
  ON public.vehicle_generations(model_id, start_year, end_year);

-- ----------------
-- RPC: generation suggestions by year
-- ----------------
CREATE OR REPLACE FUNCTION public.get_generation_suggestions(
  p_vehicle_type text,
  p_make text,
  p_model text,
  p_year int
)
RETURNS TABLE (
  generation_id uuid,
  generation_name text,
  start_year int,
  end_year int
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH make_row AS (
    SELECT id
    FROM public.vehicle_makes
    WHERE vehicle_type = COALESCE(p_vehicle_type, 'car')
      AND normalized_name = public.normalize_vehicle_text(p_make)
    LIMIT 1
  ),
  model_row AS (
    SELECT vm.id
    FROM public.vehicle_models vm
    JOIN make_row mk ON mk.id = vm.make_id
    WHERE vm.normalized_name = public.normalize_vehicle_text(p_model)
    LIMIT 1
  )
  SELECT
    g.id AS generation_id,
    g.name AS generation_name,
    g.start_year,
    g.end_year
  FROM public.vehicle_generations g
  JOIN model_row mr ON mr.id = g.model_id
  WHERE g.name IS NOT NULL
    AND (
      p_year IS NULL
      OR (
        COALESCE(g.start_year, 0) <= p_year
        AND COALESCE(g.end_year, 9999) >= p_year
      )
    )
  ORDER BY
    COALESCE(g.start_year, 0) DESC,
    COALESCE(g.end_year, 9999) DESC,
    g.created_at DESC
  LIMIT 25;
$$;

GRANT EXECUTE ON FUNCTION public.get_generation_suggestions(text, text, text, int) TO authenticated;

-- ----------------
-- Staff-only RPC helpers
-- ----------------
CREATE OR REPLACE FUNCTION public.admin_set_vehicle_generation_bounds(
  p_generation_id uuid,
  p_start_year int,
  p_end_year int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.vehicle_generations
  SET start_year = p_start_year,
      end_year = p_end_year,
      needs_review = false
  WHERE id = p_generation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_vehicle_generation_bounds(uuid, int, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_vehicle_review_queue(p_limit int DEFAULT 100)
RETURNS TABLE (
  car_id uuid,
  user_id uuid,
  vehicle_type text,
  brand text,
  model text,
  year int,
  generation text,
  needs_review boolean,
  review_reason text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id AS car_id,
    c.user_id,
    c.vehicle_type,
    c.brand,
    c.model,
    c.year,
    c.generation,
    c.needs_review,
    c.review_reason,
    c.created_at
  FROM public.cars c
  WHERE public.is_staff(auth.uid())
    AND c.needs_review = true
  ORDER BY c.created_at DESC
  LIMIT COALESCE(p_limit, 100);
$$;

GRANT EXECUTE ON FUNCTION public.get_vehicle_review_queue(int) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_mark_car_reviewed(p_car_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.cars
  SET needs_review = false,
      review_reason = null
  WHERE id = p_car_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_mark_car_reviewed(uuid) TO authenticated;

-- Merge two vehicle_models (moves generations and car links)
CREATE OR REPLACE FUNCTION public.admin_merge_vehicle_model(p_from_model_id uuid, p_to_model_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_from_model_id IS NULL OR p_to_model_id IS NULL OR p_from_model_id = p_to_model_id THEN
    RETURN;
  END IF;

  UPDATE public.vehicle_generations SET model_id = p_to_model_id WHERE model_id = p_from_model_id;
  UPDATE public.cars SET model_id = p_to_model_id WHERE model_id = p_from_model_id;

  DELETE FROM public.vehicle_models WHERE id = p_from_model_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_merge_vehicle_model(uuid, uuid) TO authenticated;

-- ----------------
-- User proposal RPC (hybrid enrichment): users can propose bounds; staff validates later.
-- ----------------
CREATE OR REPLACE FUNCTION public.propose_vehicle_generation_bounds(
  p_vehicle_type text,
  p_make text,
  p_model text,
  p_generation_name text,
  p_start_year int,
  p_end_year int
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_make_id uuid;
  v_model_id uuid;
  v_gen_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Upsert make/model (self-learning)
  INSERT INTO public.vehicle_makes (vehicle_type, name, normalized_name, needs_review)
  VALUES (COALESCE(p_vehicle_type, 'car'), p_make, public.normalize_vehicle_text(p_make), false)
  ON CONFLICT (vehicle_type, normalized_name) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_make_id;

  INSERT INTO public.vehicle_models (make_id, name, normalized_name, needs_review)
  VALUES (v_make_id, p_model, public.normalize_vehicle_text(p_model), false)
  ON CONFLICT (make_id, normalized_name) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_model_id;

  -- Upsert generation bounds (mark as needs_review until staff validates)
  INSERT INTO public.vehicle_generations (model_id, name, normalized_name, start_year, end_year, needs_review)
  VALUES (
    v_model_id,
    p_generation_name,
    public.normalize_vehicle_text(p_generation_name),
    p_start_year,
    p_end_year,
    true
  )
  ON CONFLICT (model_id, normalized_name, start_year, end_year) DO UPDATE
    SET start_year = EXCLUDED.start_year,
        end_year = EXCLUDED.end_year,
        needs_review = true
  RETURNING id INTO v_gen_id;

  RETURN v_gen_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.propose_vehicle_generation_bounds(text, text, text, text, int, int) TO authenticated;

