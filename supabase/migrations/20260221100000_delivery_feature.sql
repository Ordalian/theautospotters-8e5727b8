-- Cooldown: dernière livraison par utilisateur (une livraison max toutes les 24h)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_delivery_at timestamptz DEFAULT NULL;

-- Voiture livrée: indique qui a livré (pour afficher "livrée par X" sur la fiche)
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS delivered_by_user_id uuid DEFAULT NULL;

-- Notifications de livraison (pour afficher "X vous a envoyé Y" sur Garage d'amis)
CREATE TABLE IF NOT EXISTS public.deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  car_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_car FOREIGN KEY (car_id) REFERENCES public.cars(id) ON DELETE CASCADE,
  CONSTRAINT fk_sender FOREIGN KEY (sender_id) REFERENCES auth.users(id),
  CONSTRAINT fk_receiver FOREIGN KEY (receiver_id) REFERENCES auth.users(id)
);

ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view deliveries where they are sender or receiver"
  ON public.deliveries FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can insert deliveries as sender"
  ON public.deliveries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE INDEX IF NOT EXISTS idx_deliveries_receiver_created ON public.deliveries(receiver_id, created_at DESC);
