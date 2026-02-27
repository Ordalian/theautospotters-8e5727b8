-- Car generation (e.g. Clio I, II, III, IV, V, VI)
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS generation text DEFAULT NULL;

COMMENT ON COLUMN public.cars.generation IS 'Model generation: Roman numerals (I, II, III, IV, V, VI) or text (e.g. Mk1, Gen 2). Displayed after model: "Clio IV".';
