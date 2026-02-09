
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create cars table
CREATE TABLE public.cars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  seen_on_road BOOLEAN NOT NULL DEFAULT false,
  parked BOOLEAN NOT NULL DEFAULT false,
  stock BOOLEAN NOT NULL DEFAULT true,
  modified BOOLEAN NOT NULL DEFAULT false,
  car_meet BOOLEAN NOT NULL DEFAULT false,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cars" ON public.cars FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cars" ON public.cars FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cars" ON public.cars FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cars" ON public.cars FOR DELETE USING (auth.uid() = user_id);

-- Create storage bucket for car photos
INSERT INTO storage.buckets (id, name, public) VALUES ('car-photos', 'car-photos', true);

CREATE POLICY "Authenticated users can upload car photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'car-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view car photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'car-photos');

CREATE POLICY "Users can delete own car photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'car-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
