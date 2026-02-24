-- For miniatures (vehicle_type = hot_wheels): fabricant = Hot Wheels, Majorette, Matchbox.
-- brand/model/year then refer to the real car (Renault Clio, etc.).
ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS miniature_maker TEXT NULL;

COMMENT ON COLUMN public.cars.miniature_maker IS 'When vehicle_type = hot_wheels: manufacturer of the die-cast (Hot Wheels, Majorette, Matchbox).';
