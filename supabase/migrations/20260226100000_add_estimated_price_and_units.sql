-- Prix estimé et nombre d'unités produites (remplis par l'IA sur la fiche véhicule)
ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS estimated_price numeric,
  ADD COLUMN IF NOT EXISTS estimated_price_at timestamptz,
  ADD COLUMN IF NOT EXISTS units_produced integer;

COMMENT ON COLUMN public.cars.estimated_price IS 'Prix estimé (€) selon l''état du véhicule, renseigné par l''IA';
COMMENT ON COLUMN public.cars.estimated_price_at IS 'Date à laquelle le prix a été constaté';
COMMENT ON COLUMN public.cars.units_produced IS 'Nombre d''unités produites (modèle) ou tirage (miniature)';
