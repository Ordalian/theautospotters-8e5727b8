-- Thème par utilisateur (noir-or, bleu-alpine, etc.)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme text DEFAULT NULL;
