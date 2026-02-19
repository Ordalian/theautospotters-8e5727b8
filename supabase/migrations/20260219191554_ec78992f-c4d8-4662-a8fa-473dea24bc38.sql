ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS edition text,
  ADD COLUMN IF NOT EXISTS modified_comment text,
  ADD COLUMN IF NOT EXISTS car_condition text DEFAULT 'good',
  ADD COLUMN IF NOT EXISTS photo_source text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS quality_rating integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS rarity_rating integer DEFAULT 5;