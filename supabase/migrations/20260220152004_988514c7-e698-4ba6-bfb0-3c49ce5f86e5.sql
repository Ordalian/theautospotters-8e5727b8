
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pinned_car_id uuid DEFAULT NULL;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS location_precision text DEFAULT NULL;
