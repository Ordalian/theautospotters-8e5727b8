-- Vehicle catalog V1: normalized makes/models/generations + links from cars.
-- Goal: progressively enrich catalog from user inserts (hybrid approach).

-- ================
-- Helpers
-- ================
CREATE OR REPLACE FUNCTION public.normalize_vehicle_text(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(regexp_replace(lower(coalesce(p_text, '')), '\s+', ' ', 'g'));
$$;

-- ================
-- Reference tables
-- ================
CREATE TABLE IF NOT EXISTS public.vehicle_makes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_type text NOT NULL,
  name text NOT NULL,
  normalized_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vehicle_makes_vehicle_type_check
    CHECK (vehicle_type IN ('car', 'truck', 'motorcycle', 'boat', 'plane', 'train', 'hot_wheels')),
  CONSTRAINT vehicle_makes_unique UNIQUE (vehicle_type, normalized_name)
);

CREATE TABLE IF NOT EXISTS public.vehicle_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  make_id uuid NOT NULL REFERENCES public.vehicle_makes(id) ON DELETE CASCADE,
  name text NOT NULL,
  normalized_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vehicle_models_unique UNIQUE (make_id, normalized_name)
);

CREATE TABLE IF NOT EXISTS public.vehicle_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.vehicle_models(id) ON DELETE CASCADE,
  -- Free-form label like "Mk7", "III", "Gen 2", "W204", etc.
  name text,
  normalized_name text,
  -- Optional: known production bounds
  start_year int,
  end_year int,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vehicle_generations_year_check
    CHECK (
      start_year IS NULL OR end_year IS NULL OR (start_year >= 1800 AND end_year >= start_year AND end_year <= 2100)
    )
);

CREATE INDEX IF NOT EXISTS idx_vehicle_makes_type_name ON public.vehicle_makes(vehicle_type, normalized_name);
CREATE INDEX IF NOT EXISTS idx_vehicle_models_make_name ON public.vehicle_models(make_id, normalized_name);
CREATE INDEX IF NOT EXISTS idx_vehicle_generations_model_year ON public.vehicle_generations(model_id, start_year, end_year);
CREATE UNIQUE INDEX IF NOT EXISTS ux_vehicle_generations_model_name_year
  ON public.vehicle_generations(model_id, normalized_name, start_year, end_year)
  WHERE normalized_name IS NOT NULL;

-- ================
-- Link from cars
-- ================
ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS make_id uuid REFERENCES public.vehicle_makes(id),
  ADD COLUMN IF NOT EXISTS model_id uuid REFERENCES public.vehicle_models(id),
  ADD COLUMN IF NOT EXISTS generation_id uuid REFERENCES public.vehicle_generations(id);

CREATE INDEX IF NOT EXISTS idx_cars_make_model ON public.cars(make_id, model_id);
CREATE INDEX IF NOT EXISTS idx_cars_generation ON public.cars(generation_id);

-- ================
-- RLS (read-only for all authenticated; write via SECURITY DEFINER trigger)
-- ================
ALTER TABLE public.vehicle_makes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_generations ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read catalog
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'vehicle_makes' AND policyname = 'Authenticated can read vehicle makes'
  ) THEN
    CREATE POLICY "Authenticated can read vehicle makes"
    ON public.vehicle_makes FOR SELECT TO authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'vehicle_models' AND policyname = 'Authenticated can read vehicle models'
  ) THEN
    CREATE POLICY "Authenticated can read vehicle models"
    ON public.vehicle_models FOR SELECT TO authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'vehicle_generations' AND policyname = 'Authenticated can read vehicle generations'
  ) THEN
    CREATE POLICY "Authenticated can read vehicle generations"
    ON public.vehicle_generations FOR SELECT TO authenticated
    USING (true);
  END IF;
END $$;

-- ================
-- Upsert catalog from cars inserts/updates
-- ================
CREATE OR REPLACE FUNCTION public.upsert_vehicle_catalog_from_car()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type text;
  v_make_name text;
  v_model_name text;
  v_gen_name text;
  v_make_id uuid;
  v_model_id uuid;
  v_generation_id uuid;
BEGIN
  v_type := COALESCE(NEW.vehicle_type, 'car');
  v_make_name := NULLIF(trim(NEW.brand), '');
  v_model_name := NULLIF(trim(NEW.model), '');
  v_gen_name := NULLIF(trim(NEW.generation), '');

  -- Skip catalog for missing required fields
  IF v_make_name IS NULL OR v_model_name IS NULL THEN
    RETURN NEW;
  END IF;

  -- Upsert make
  INSERT INTO public.vehicle_makes (vehicle_type, name, normalized_name)
  VALUES (v_type, v_make_name, public.normalize_vehicle_text(v_make_name))
  ON CONFLICT (vehicle_type, normalized_name)
  DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_make_id;

  -- Upsert model
  INSERT INTO public.vehicle_models (make_id, name, normalized_name)
  VALUES (v_make_id, v_model_name, public.normalize_vehicle_text(v_model_name))
  ON CONFLICT (make_id, normalized_name)
  DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_model_id;

  -- Upsert generation only if provided (keeps V1 light)
  IF v_gen_name IS NOT NULL THEN
    INSERT INTO public.vehicle_generations (model_id, name, normalized_name, start_year, end_year)
    VALUES (
      v_model_id,
      v_gen_name,
      public.normalize_vehicle_text(v_gen_name),
      NEW.year,
      NEW.year
    )
    ON CONFLICT (model_id, normalized_name, start_year, end_year) DO NOTHING
    RETURNING id INTO v_generation_id;

    -- If conflict/no insert, try to find existing one
    IF v_generation_id IS NULL THEN
      SELECT id INTO v_generation_id
      FROM public.vehicle_generations
      WHERE model_id = v_model_id
        AND normalized_name = public.normalize_vehicle_text(v_gen_name)
        AND (start_year IS NULL OR start_year = NEW.year)
        AND (end_year IS NULL OR end_year = NEW.year)
      ORDER BY created_at DESC
      LIMIT 1;
    END IF;
  END IF;

  NEW.make_id := v_make_id;
  NEW.model_id := v_model_id;
  NEW.generation_id := v_generation_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_cars_upsert_vehicle_catalog ON public.cars;
CREATE TRIGGER tr_cars_upsert_vehicle_catalog
  BEFORE INSERT OR UPDATE OF brand, model, generation, year, vehicle_type
  ON public.cars
  FOR EACH ROW
  EXECUTE FUNCTION public.upsert_vehicle_catalog_from_car();

-- Backfill existing rows (populate make_id/model_id/generation_id).
-- This is safe: it does not change user-facing text fields.
UPDATE public.cars
SET
  brand = brand,
  model = model,
  generation = generation,
  year = year,
  vehicle_type = vehicle_type;

