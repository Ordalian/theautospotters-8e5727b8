
-- 1. Add media columns to direct_messages
ALTER TABLE public.direct_messages ADD COLUMN image_url text;
ALTER TABLE public.direct_messages ADD COLUMN video_url text;

-- 2. Add notification preference columns to profiles
ALTER TABLE public.profiles ADD COLUMN notify_channels boolean NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN notify_dms boolean NOT NULL DEFAULT true;

-- 3. Create channel_subscriptions table for per-channel bell
CREATE TABLE public.channel_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, channel_id)
);

ALTER TABLE public.channel_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own channel subscriptions"
ON public.channel_subscriptions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Create storage bucket for DM media
INSERT INTO storage.buckets (id, name, public) VALUES ('dm-media', 'dm-media', true);

-- 5. Storage RLS: only sender can upload, anyone can read (public bucket)
CREATE POLICY "Authenticated users can upload dm media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'dm-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view dm media"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'dm-media');

CREATE POLICY "Users can delete own dm media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'dm-media' AND (storage.foldername(name))[1] = auth.uid()::text);
