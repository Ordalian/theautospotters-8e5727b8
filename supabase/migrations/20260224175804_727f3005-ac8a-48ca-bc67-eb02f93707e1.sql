-- Add vehicle_type to cars: car | truck | motorcycle | boat | plane | train | hot_wheels
-- Existing rows default to 'car'.
ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS vehicle_type TEXT NOT NULL DEFAULT 'car';

ALTER TABLE public.cars
  DROP CONSTRAINT IF EXISTS cars_vehicle_type_check;
ALTER TABLE public.cars
  ADD CONSTRAINT cars_vehicle_type_check
  CHECK (vehicle_type IN ('car', 'truck', 'motorcycle', 'boat', 'plane', 'train', 'hot_wheels'));

CREATE INDEX IF NOT EXISTS idx_cars_vehicle_type ON public.cars(user_id, vehicle_type);

COMMENT ON COLUMN public.cars.vehicle_type IS 'Type of spotted vehicle: car, truck, motorcycle, boat, plane, train, hot_wheels';