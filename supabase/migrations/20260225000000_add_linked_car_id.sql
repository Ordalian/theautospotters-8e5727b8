-- Link between a spotted vehicle and its Hot Wheels (or vice versa). Both profiles get golden theme and swap button.
ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS linked_car_id uuid NULL REFERENCES public.cars(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cars_linked_car_id ON public.cars(linked_car_id) WHERE linked_car_id IS NOT NULL;

COMMENT ON COLUMN public.cars.linked_car_id IS 'When set, this spot has a corresponding Hot Wheels / real vehicle; both show golden theme and swap button.';
