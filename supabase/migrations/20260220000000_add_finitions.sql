-- Finitions (optionnel) : niveau de finition après édition/série limitée (ex. GT Line, Sport Pack)
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS finitions text DEFAULT NULL;
