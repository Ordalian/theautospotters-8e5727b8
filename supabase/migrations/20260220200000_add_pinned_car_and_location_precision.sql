-- Spot épinglé sur la tuile Mon garage
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pinned_car_id uuid DEFAULT NULL;
-- Précision lieu : 'precise' (rond sur la carte) ou 'general' (carré)
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS location_precision text DEFAULT 'precise';
