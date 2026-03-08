
-- Table for car likes/hearts
CREATE TABLE public.car_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  car_id uuid NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, car_id)
);

ALTER TABLE public.car_likes ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can see likes
CREATE POLICY "Authenticated users can view likes"
  ON public.car_likes FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own likes
CREATE POLICY "Users can insert own likes"
  ON public.car_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own likes
CREATE POLICY "Users can delete own likes"
  ON public.car_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
