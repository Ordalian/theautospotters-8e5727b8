-- Replace horsepower with engine text column
ALTER TABLE public.cars DROP COLUMN IF EXISTS horsepower;
ALTER TABLE public.cars ADD COLUMN engine text DEFAULT NULL;