-- Table des photos supplémentaires par voiture (la première reste dans cars.image_url)
CREATE TABLE IF NOT EXISTS public.car_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.car_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view car_photos of own cars"
  ON public.car_photos FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.cars c WHERE c.id = car_photos.car_id AND c.user_id = auth.uid())
  );
CREATE POLICY "Users can insert car_photos for own cars"
  ON public.car_photos FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.cars c WHERE c.id = car_photos.car_id AND c.user_id = auth.uid())
  );
CREATE POLICY "Users can delete car_photos of own cars"
  ON public.car_photos FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.cars c WHERE c.id = car_photos.car_id AND c.user_id = auth.uid())
  );

-- Amis peuvent voir les photos des voitures des amis (pour afficher la fiche)
CREATE POLICY "Friends can view car_photos of friends cars"
  ON public.car_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cars c
      JOIN public.friendships f ON (
        (f.requester_id = auth.uid() AND f.addressee_id = c.user_id AND f.status = 'accepted')
        OR (f.addressee_id = auth.uid() AND f.requester_id = c.user_id AND f.status = 'accepted')
      )
      WHERE c.id = car_photos.car_id
    )
  );

CREATE INDEX IF NOT EXISTS idx_car_photos_car_id ON public.car_photos(car_id);
CREATE INDEX IF NOT EXISTS idx_car_photos_position ON public.car_photos(car_id, position);

-- Groupes de garage (nommés par l'utilisateur)
CREATE TABLE IF NOT EXISTS public.garage_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.garage_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own garage_groups"
  ON public.garage_groups FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_garage_groups_user_id ON public.garage_groups(user_id);

-- Lier une voiture à un groupe (nullable)
ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS garage_group_id UUID REFERENCES public.garage_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cars_garage_group_id ON public.cars(garage_group_id);

-- Véhicules en possession (plaque d'immatriculation, privé)
CREATE TABLE IF NOT EXISTS public.owned_vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  car_id UUID REFERENCES public.cars(id) ON DELETE SET NULL,
  license_plate TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT owned_vehicle_car_same_user CHECK (
    car_id IS NULL OR EXISTS (SELECT 1 FROM public.cars c WHERE c.id = car_id AND c.user_id = owned_vehicles.user_id)
  )
);

ALTER TABLE public.owned_vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own owned_vehicles"
  ON public.owned_vehicles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_owned_vehicles_user_id ON public.owned_vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_owned_vehicles_license_plate ON public.owned_vehicles(license_plate);

-- Plaque optionnelle sur un spot (pour matching, non affichée aux autres)
ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS license_plate TEXT;

-- Notifications (ex: "Votre véhicule a été spotté")
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications (mark read)"
  ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON public.notifications(user_id, read_at);

-- Normaliser une plaque (majuscules, sans espaces ni tirets)
CREATE OR REPLACE FUNCTION public.normalize_license_plate(plate TEXT)
RETURNS TEXT AS $$
  SELECT upper(regexp_replace(regexp_replace(COALESCE(trim(plate), ''), '\s', '', 'g'), '-', '', 'g'));
$$ LANGUAGE sql IMMUTABLE;

-- Lors de l'insertion d'une voiture avec plaque : notifier les propriétaires dont la plaque correspond
CREATE OR REPLACE FUNCTION public.notify_owner_if_vehicle_spotted()
RETURNS TRIGGER AS $$
DECLARE
  n_plate TEXT;
  r RECORD;
BEGIN
  IF NEW.license_plate IS NULL OR trim(NEW.license_plate) = '' THEN
    RETURN NEW;
  END IF;
  n_plate := public.normalize_license_plate(NEW.license_plate);
  IF n_plate = '' THEN
    RETURN NEW;
  END IF;
  FOR r IN
    SELECT ov.user_id
    FROM public.owned_vehicles ov
    WHERE public.normalize_license_plate(ov.license_plate) = n_plate
      AND ov.user_id != NEW.user_id
  LOOP
    INSERT INTO public.notifications (user_id, type, data)
    VALUES (r.user_id, 'vehicle_spotted', jsonb_build_object(
      'spotted_car_id', NEW.id,
      'brand', NEW.brand,
      'model', NEW.model,
      'year', NEW.year
    ));
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_car_inserted_vehicle_spotted ON public.cars;
CREATE TRIGGER on_car_inserted_vehicle_spotted
  AFTER INSERT ON public.cars
  FOR EACH ROW EXECUTE FUNCTION public.notify_owner_if_vehicle_spotted();
