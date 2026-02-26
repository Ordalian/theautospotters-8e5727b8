-- Slots for 3 emblems displayed on stats (achievement ids: spotter, etc.)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emblem_slot_1 text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emblem_slot_2 text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emblem_slot_3 text DEFAULT NULL;

COMMENT ON COLUMN public.profiles.emblem_slot_1 IS 'Achievement id shown in first emblem slot on stats (e.g. spotter)';
COMMENT ON COLUMN public.profiles.emblem_slot_2 IS 'Achievement id shown in second emblem slot';
COMMENT ON COLUMN public.profiles.emblem_slot_3 IS 'Achievement id shown in third emblem slot';
